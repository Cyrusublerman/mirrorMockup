import { BONE_PARENT, SEMANTIC } from "../domains/body/skeleton.js";
import { renderField } from "../domains/export/image.js";
import { BoneIndex, PICK_JOINTS } from "./bone_index.js";
import { MirrorReflector } from "./mirror_reflector.js";
import { CaptureCamera, EDITOR_LAYER, letterboxRect } from "./capture_camera.js";
import { FramingPolicy } from "./framing_policy.js";
import { ViewState, EDITOR_VIEWS } from "../ui/state/view_state.js";

function geometryFromMesh(THREE, mesh) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(mesh.positions.length * 3);
  for (let i = 0; i < mesh.positions.length; i++) { pos[i*3]=mesh.positions[i][0]; pos[i*3+1]=mesh.positions[i][1]; pos[i*3+2]=mesh.positions[i][2]; }
  const idx=[]; for(const t of mesh.triangles) idx.push(t[0],t[1],t[2]);
  geo.setAttribute("position",new THREE.BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();geo.computeBoundingSphere();return geo;
}
function writePositions(geo,positions){const arr=geo.getAttribute("position").array;for(let i=0;i<positions.length;i++){arr[i*3]=positions[i][0];arr[i*3+1]=positions[i][1];arr[i*3+2]=positions[i][2];}geo.getAttribute("position").needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();}
function repoRootUrl(){return new URL("../../",import.meta.url);}
function glbCandidates(rel){const path=rel.replace(/^\.\//,"");const out=[];if(/^(https?:|blob:|data:)/i.test(path))return[path];out.push(new URL(path,repoRootUrl()).href);if(globalThis.MIRROR_REPO)out.push(new URL(path,String(globalThis.MIRROR_REPO).replace(/\/?$/, "/")).href);if(typeof document!=="undefined"&&document.baseURI)out.push(new URL(path,document.baseURI).href);out.push(path);return[...new Set(out)];}
async function loadGlb(loader,rel){let last=null;for(const url of glbCandidates(rel)){try{return await loader.loadAsync(url);}catch(err){last=err;}}throw last||new Error("glb not found");}

function pickRadius(id,fk){const glb=SEMANTIC[id];let child=null;for(const other of PICK_JOINTS){if(other===id)continue;if(BONE_PARENT[SEMANTIC[other]]===glb){child=fk?.[other];break;}}const p=fk?.[id];if(p&&child){const len=Math.hypot(p[0]-child[0],p[1]-child[1],p[2]-child[2]);return Math.max(.025,len*.35);}const parentName=BONE_PARENT[glb];if(p&&parentName){for(const[sem,g]of Object.entries(SEMANTIC)){if(g!==parentName)continue;const q=fk?.[sem];if(q){const len=Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);return Math.max(.025,len*.35);}}}return .04;}

function makeRenderer(THREE,canvas){if(!canvas)return null;const r=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:"default",failIfMajorPerformanceCaveat:false,preserveDrawingBuffer:true});r.setPixelRatio(Math.min(2,globalThis.devicePixelRatio||1));r.autoClear=true;r.localClippingEnabled=true;return r;}

function clearGroup(group){while(group.children.length){const c=group.children.pop();c.geometry?.dispose?.();if(Array.isArray(c.material))c.material.forEach((m)=>m.dispose?.());else c.material?.dispose?.();}}
function applyPrimitive(THREE,mesh,part){
  if(part.kind==="capsule"){
    const a=new THREE.Vector3(...part.a),b=new THREE.Vector3(...part.b),v=new THREE.Vector3().subVectors(b,a),len=v.length();
    mesh.position.copy(a).add(b).multiplyScalar(.5);if(len>1e-9)mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());mesh.scale.set(1,len,1);
  }else{mesh.position.set(...part.centre);const r=part.radii||[.05,.05,.05];mesh.scale.set(r[0],r[1],r[2]);}
}
function syncVolumeGroup(THREE,group,volume,material){clearGroup(group);for(const part of Object.values(volume?.parts||{})){let mesh;if(part.kind==="capsule"){mesh=new THREE.Mesh(new THREE.CylinderGeometry(part.radius,part.radius,1,10,1,false),material.clone());}else{mesh=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),material.clone());}applyPrimitive(THREE,mesh,part);group.add(mesh);}}
function syncContourGroup(THREE,group,contour,material){clearGroup(group);for(const part of Object.values(contour?.parts||{})){let mesh;if(part.kind==="capsule")mesh=new THREE.Mesh(new THREE.CylinderGeometry(part.radius,part.radius,1,12,1,false),material.clone());else mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),material.clone());applyPrimitive(THREE,mesh,part);group.add(mesh);}}

export async function createScene3D(canvas,app,opts={}){
  const THREE=await import("three");
  const {GLTFLoader}=await import("three/addons/loaders/GLTFLoader.js");
  const renderer=makeRenderer(THREE,canvas);
  const outputRenderer=makeRenderer(THREE,opts.insetCanvas||null);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xfcfbf8);
  const editorCam=new THREE.OrthographicCamera(-1,1,1,-1,.02,40);editorCam.up.set(0,0,1);editorCam.layers.enable(EDITOR_LAYER);
  const capture=new CaptureCamera(THREE);const framing=new FramingPolicy();const viewState=opts.viewState||new ViewState();
  scene.add(new THREE.HemisphereLight(0xffffff,0x444466,1.15));const dir=new THREE.DirectionalLight(0xffffff,.75);dir.position.set(2,-2,4);scene.add(dir);
  const grid=new THREE.GridHelper(4,16,0xcccccc,0xeeeeee);grid.rotation.x=Math.PI/2;scene.add(grid);
  const gnomon=new THREE.AxesHelper(.18);gnomon.layers.set(EDITOR_LAYER);scene.add(gnomon);const viewLabel={text:"ISO"};

  const phoneMesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.35,roughness:.45,side:THREE.DoubleSide}));phoneMesh.userData.pick={kind:"phone"};
  const screenMesh=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:0x8eb4ff,side:THREE.DoubleSide}));
  const fieldTex=new THREE.DataTexture(new Uint8Array(64*64*4),64,64,THREE.RGBAFormat);fieldTex.needsUpdate=true;fieldTex.flipY=true;screenMesh.material.map=fieldTex;screenMesh.material.needsUpdate=true;phoneMesh.add(screenMesh);scene.add(phoneMesh);
  const mirrorMesh3=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:0xcbd6dc,transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide}));mirrorMesh3.userData.pick={kind:"mirror"};scene.add(mirrorMesh3);

  const bodyRoot=new THREE.Group();scene.add(bodyRoot);const reflector=new MirrorReflector(THREE,scene);const loader=new GLTFLoader();
  const glbRel=app.getRequested()?.body?.definition?.glb||"fixtures/P0/base_female_rigged.glb";
  let gltfScene=null,boneIndex=null;
  try{
    const gltf=await loadGlb(loader,glbRel);gltfScene=gltf.scene;boneIndex=new BoneIndex(gltfScene,SEMANTIC);
    const fk0=app.getEffective()?.skeleton?.fk;
    for(const id of PICK_JOINTS){if(!boneIndex.get(id))throw new Error(`semantic bone unresolved ${id}`);if(!fk0?.[id])throw new Error(`pick joint missing FK ${id}`);}
    if(PICK_JOINTS.length!==24)throw new Error(`ACC-RIG-01 expected 24 semantic pick joints, found ${PICK_JOINTS.length}`);
    gltfScene.traverse((obj)=>{if(obj.isMesh){obj.frustumCulled=false;obj.userData.pick={kind:"body",id:"body"};obj.userData.riggedMaterial=obj.material;}});
    gltfScene.visible=false;bodyRoot.add(gltfScene);reflector.attachBody(gltfScene);
  }catch(err){throw new Error(`ACC-RIG-01 boot assertion failed: ${err?.message||err}`);}

  const boneGeo=new THREE.BufferGeometry();const boneLine=new THREE.LineSegments(boneGeo,new THREE.LineBasicMaterial({color:0x111111}));scene.add(boneLine);reflector.attachStick(boneLine);
  const volumeGroup=new THREE.Group();scene.add(volumeGroup);const volumeMat=new THREE.MeshBasicMaterial({color:0x6b3fa0,transparent:true,opacity:.42,depthWrite:false});reflector.attachSimple(volumeGroup);
  const contourGroup=new THREE.Group();scene.add(contourGroup);const contourMat=new THREE.MeshBasicMaterial({color:0x111111,wireframe:true,transparent:true,opacity:.95});reflector.attachContour(contourGroup);
  reflector.attachPhone(phoneMesh,screenMesh);

  const pickGroup=new THREE.Group();pickGroup.layers.set(EDITOR_LAYER);scene.add(pickGroup);
  const pickMats={idle:new THREE.MeshBasicMaterial({color:0xc41e63,transparent:true,opacity:0,depthTest:true,depthWrite:false}),hot:new THREE.MeshBasicMaterial({color:0xc41e63,transparent:true,opacity:0,depthTest:true,depthWrite:false})};
  const ringMat=new THREE.MeshBasicMaterial({color:0xc41e63,transparent:true,opacity:.95,depthTest:true,side:THREE.DoubleSide});const pickSpheres={},pickRings={};
  for(const id of PICK_JOINTS){const r=pickRadius(id,app.getEffective()?.skeleton?.fk);const s=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),pickMats.idle);s.userData.pick={kind:"joint",id};s.layers.set(EDITOR_LAYER);s.renderOrder=20;pickGroup.add(s);pickSpheres[id]=s;const ring=new THREE.Mesh(new THREE.TorusGeometry(r*1.15,r*.08,8,24),ringMat);ring.visible=false;ring.layers.set(EDITOR_LAYER);pickGroup.add(ring);pickRings[id]=ring;}
  const ghostMat=new THREE.MeshBasicMaterial({color:0xc41e63,wireframe:true,transparent:true,opacity:.85});const ghostSphere=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),ghostMat);ghostSphere.visible=false;ghostSphere.layers.set(EDITOR_LAYER);scene.add(ghostSphere);

  const bodyMode={kind:"VOLUME"};const orbit={theta:.7,phi:1.15};const room={id:"POSE"};const frame={target:[0,.9,.9],radius:2.4,userScale:1};const raycaster=new THREE.Raycaster();raycaster.layers.enable(EDITOR_LAYER);const ndc=new THREE.Vector2();let paneW=800,paneH=600;

  function applyEditor(cam3,eff){const fitted=room.id==="SCENE"?framing.fitApparatus(eff):framing.fitBody(eff.skeleton?.fk);frame.target=fitted.target;frame.radius=fitted.radius;const t=frame.target,r=frame.radius*frame.userScale,view=viewState.editor_view;viewLabel.text=view;if(view==="FRONT")cam3.position.set(t[0],t[1]-r,t[2]);else if(view==="BACK")cam3.position.set(t[0],t[1]+r,t[2]);else if(view==="LEFT")cam3.position.set(t[0]-r,t[1],t[2]);else if(view==="RIGHT")cam3.position.set(t[0]+r,t[1],t[2]);else if(view==="TOP")cam3.position.set(t[0],t[1],t[2]+r);else cam3.position.set(t[0]+r*Math.sin(orbit.phi)*Math.sin(orbit.theta),t[1]-r*Math.sin(orbit.phi)*Math.cos(orbit.theta),t[2]+r*Math.cos(orbit.phi));cam3.up.set(0,0,1);cam3.lookAt(...t);const half=r*.55,aspect=paneW/Math.max(paneH,1);cam3.left=-half*aspect;cam3.right=half*aspect;cam3.top=half;cam3.bottom=-half;cam3.updateProjectionMatrix();gnomon.position.set(...t);}

  function syncMeshes(eff,req){
    const prism=eff.phone.mesh;if(prism?.positions){if(phoneMesh.geometry.getAttribute("position")?.count!==prism.positions.length){phoneMesh.geometry.dispose();phoneMesh.geometry=geometryFromMesh(THREE,prism);}else writePositions(phoneMesh.geometry,prism.positions);}
    const screen=eff.phone.screen_mesh;if(screen?.positions){if(screenMesh.geometry.getAttribute("position")?.count!==screen.positions.length){screenMesh.geometry.dispose();screenMesh.geometry=geometryFromMesh(THREE,screen);}else writePositions(screenMesh.geometry,screen.positions);}
    const pw=eff.phone.world;phoneMesh.position.set(...pw.translation);phoneMesh.quaternion.set(pw.rotation[0],pw.rotation[1],pw.rotation[2],pw.rotation[3]);phoneMesh.visible=true;
    const field=renderField(eff,req,64,64);if(field?.rgba?.length===fieldTex.image.data.length){fieldTex.image.data.set(field.rgba);fieldTex.needsUpdate=true;}
    const mm=eff.mirror.mesh;if(mm?.positions){if(mirrorMesh3.geometry.getAttribute("position")?.count!==mm.positions.length){mirrorMesh3.geometry.dispose();mirrorMesh3.geometry=geometryFromMesh(THREE,mm);}else writePositions(mirrorMesh3.geometry,mm.positions);}mirrorMesh3.position.set(0,0,0);mirrorMesh3.quaternion.identity();mirrorMesh3.visible=true;

    const skel=eff.skeleton,rootXf=skel?.root_world;if(rootXf){bodyRoot.position.set(...rootXf.translation);bodyRoot.quaternion.set(rootXf.rotation[0],rootXf.rotation[1],rootXf.rotation[2],rootXf.rotation[3]);bodyRoot.scale.set(...(rootXf.scale||[1,1,1]));}
    if(gltfScene&&skel?.locals&&boneIndex){boneIndex.applyLocals(skel.locals);gltfScene.updateMatrixWorld(true);gltfScene.traverse((obj)=>{if(obj.isSkinnedMesh&&obj.skeleton)obj.skeleton.update();});}bodyRoot.updateMatrixWorld(true);

    if(skel?.world){const pts=[];for(const[name,xf]of Object.entries(skel.world)){const parent=BONE_PARENT[name],px=parent&&skel.world[parent];if(px)pts.push(...px.translation,...xf.translation);}boneGeo.setAttribute("position",new THREE.Float32BufferAttribute(pts,3));}
    syncVolumeGroup(THREE,volumeGroup,eff.volume,volumeMat);syncContourGroup(THREE,contourGroup,eff.contour,contourMat);
    boneLine.visible=bodyMode.kind==="GESTURE";volumeGroup.visible=false;contourGroup.visible=bodyMode.kind==="CONTOUR";
    gltfScene.visible=bodyMode.kind==="VOLUME";
    reflector.update(eff,{bodyRoot,phoneMesh,stick:boneLine,simple:volumeGroup,contour:contourGroup});reflector.setRepresentation(bodyMode.kind);

    const sel=req.workspace.selection;for(const id of PICK_JOINTS){const p=skel?.fk?.[id],sph=pickSpheres[id],ring=pickRings[id];if(!p||!sph)continue;sph.position.set(...p);const on=sel===id||sel===`joint:${id}`;sph.material=on?pickMats.hot:pickMats.idle;sph.visible=true;if(ring){ring.visible=on;ring.position.set(...p);}}
    const want=req.body?.pose_targets?.endpoint_targets?.wrist_R,got=skel?.fk?.wrist_R;if(want&&got){const far=Math.hypot(want[0]-got[0],want[1]-got[1],want[2]-got[2])>.03;ghostSphere.visible=far;if(far)ghostSphere.position.set(...want);}else ghostSphere.visible=false;
  }

  function renderWith(r,cam,w,h,clear){if(!r)return;r.setSize(Math.max(1,w),Math.max(1,h),false);r.setClearColor(clear,1);r.setScissorTest(false);r.setViewport(0,0,w,h);r.clear();r.render(scene,cam);}
  function setEditorDecor(on){grid.visible=on;pickGroup.visible=on;gnomon.visible=on;ghostSphere.visible=on&&ghostSphere.visible;}
  function renderCameras(eff){
    const parent=canvas.parentElement;paneW=Math.max(1,canvas.clientWidth||parent?.clientWidth||800);paneH=Math.max(1,canvas.clientHeight||parent?.clientHeight||600);applyEditor(editorCam,eff);capture.apply(eff);const capCam=capture.cam,mainCapture=viewState.main_pane==="CAPTURE";
    setEditorDecor(!mainCapture);
    if(mainCapture){const box=letterboxRect(paneW,paneH,3/4);renderer.setSize(paneW,paneH,false);renderer.setClearColor(0x111111,1);renderer.clear();renderer.setViewport(box.x,box.y,box.w,box.h);renderer.setScissor(box.x,box.y,box.w,box.h);renderer.setScissorTest(true);renderer.render(scene,capCam);renderer.setScissorTest(false);}else renderWith(renderer,editorCam,paneW,paneH,0xfcfbf8);
    if(outputRenderer&&opts.insetCanvas&&!opts.insetCanvas.hidden){const iw=Math.max(1,opts.insetCanvas.clientWidth||360),ih=Math.max(1,opts.insetCanvas.clientHeight||480);const outCam=mainCapture?editorCam:capCam;setEditorDecor(mainCapture);if(outCam===capCam){const box=letterboxRect(iw,ih,3/4);outputRenderer.setSize(iw,ih,false);outputRenderer.setClearColor(0x111111,1);outputRenderer.clear();outputRenderer.setViewport(box.x,box.y,box.w,box.h);outputRenderer.setScissor(box.x,box.y,box.w,box.h);outputRenderer.setScissorTest(true);outputRenderer.render(scene,outCam);outputRenderer.setScissorTest(false);}else renderWith(outputRenderer,outCam,iw,ih,0xfcfbf8);}
    setEditorDecor(!mainCapture);renderer.setViewport(0,0,paneW,paneH);
  }
  function resize(){const parent=canvas.parentElement;paneW=Math.max(1,canvas.clientWidth||parent?.clientWidth||800);paneH=Math.max(1,canvas.clientHeight||parent?.clientHeight||600);renderer.setSize(paneW,paneH,false);if(outputRenderer&&opts.insetCanvas)outputRenderer.setSize(Math.max(1,opts.insetCanvas.clientWidth||360),Math.max(1,opts.insetCanvas.clientHeight||480),false);}
  function sync(){const eff=app.getEffective(),req=app.getRequested();syncMeshes(eff,req);renderCameras(eff);}

  function hitTest(clientX,clientY,targetCam,viewRect){const cam=targetCam||(viewState.main_pane==="CAPTURE"?capture.cam:editorCam),rect=viewRect||canvas.getBoundingClientRect();ndc.x=((clientX-rect.left)/rect.width)*2-1;ndc.y=-((clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(ndc,cam);const objs=[...Object.values(pickSpheres),phoneMesh,mirrorMesh3];const hits=raycaster.intersectObjects(objs,true);for(const h of hits){let o=h.object;while(o&&!o.userData.pick)o=o.parent;if(!o?.userData.pick)continue;return{...o.userData.pick,point:[h.point.x,h.point.y,h.point.z],world:h.point};}return null;}
  function orbitBy(dx,dy){orbit.theta+=dx*.01;orbit.phi=Math.min(2.8,Math.max(.2,orbit.phi+dy*.01));}
  function dolly(factor){frame.userScale=Math.min(6,Math.max(.25,frame.userScale*factor));}
  function setEditorView(name){if(name==="CAMERA"||name==="SIDE"){if(name==="CAMERA")viewState.setMainPane("CAPTURE");else viewState.setEditorView("RIGHT");return;}if(EDITOR_VIEWS.includes(name)){viewState.setEditorView(name);viewState.setMainPane("EDITOR");}}
  function swapInset(){viewState.swap();}
  function dragDeltaWorld(dx,dy,scale=.0022){const cam=viewState.main_pane==="CAPTURE"?capture.cam:editorCam,right=new THREE.Vector3(),up=new THREE.Vector3(),fwd=new THREE.Vector3();cam.matrixWorld.extractBasis(right,up,fwd);return[right.x*dx*scale+up.x*-dy*scale,right.y*dx*scale+up.y*-dy*scale,right.z*dx*scale+up.z*-dy*scale];}

  resize();if(typeof window!=="undefined")window.addEventListener("resize",resize);
  return {sync,resize,renderer,outputRenderer,scene,camera:editorCam,capture,reflector,hitTest,orbit:orbitBy,dolly,setEditorView,swapInset,dragDeltaWorld,setBodyMode:(kind)=>{if(!["GESTURE","VOLUME","CONTOUR"].includes(kind))throw new Error(`unknown representation ${kind}`);bodyMode.kind=kind;},setRoom:(id)=>{room.id=id;frame.userScale=1;},viewState,viewLabel,workspace:{get editor_view(){return viewState.main_pane==="CAPTURE"?"CAMERA":viewState.editor_view;},set editor_view(v){setEditorView(v);}},SEMANTIC,boneIndex};
}
