import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createApp } from "../src/app/facade.js";
import { BoneIndex } from "../src/render/bone_index.js";
import { MirrorReflector } from "../src/render/mirror_reflector.js";
import { SEMANTIC } from "../src/domains/body/skeleton.js";
import { householderAffine, reflectPoint } from "../src/domains/reflection/reflect.js";
import { add, scale, sub } from "../src/shared_math/vector.js";
import { t } from "../fixtures/tolerances.js";

async function loadRig(){
  globalThis.self??=globalThis;globalThis.window??=globalThis;globalThis.document??={createElement:()=>({getContext:()=>null,style:{}}),createElementNS:()=>({style:{}})};globalThis.createImageBitmap??=async()=>({width:1,height:1,close(){}});
  const {GLTFLoader}=await import("three/examples/jsm/loaders/GLTFLoader.js");
  const buf=readFileSync(new URL("../fixtures/P0/base_female_rigged.glb",import.meta.url));const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
  return new Promise((ok,err)=>new GLTFLoader().parse(ab,"",(g)=>ok(g.scene),err));
}

function worldOf(THREE,bone){const v=new THREE.Vector3();bone.updateWorldMatrix(true,false);bone.getWorldPosition(v);return[v.x,v.y,v.z];}

test("ACC-REG-02a · Three Matrix4 Householder matches point reflection",async()=>{
  const THREE=await import("three");
  const e=createApp().getEffective(),H=householderAffine(e.mirror.centre,e.mirror.basis.n),m=new THREE.Matrix4();
  m.set(...H);
  const X=[.12,.34,1.1],v=new THREE.Vector3(...X).applyMatrix4(m),want=reflectPoint(X,e.mirror.centre,e.mirror.basis.n);
  assert.ok(Math.hypot(v.x-want[0],v.y-want[1],v.z-want[2])<1e-9,JSON.stringify({got:[v.x,v.y,v.z],want,H}));
});

test("ACC-REG-02 · live skinned mirror clone tracks reflected solver FK within 5 mm",async()=>{
  const THREE=await import("three");
  const source=await loadRig();
  const app=createApp(),skel=app.getEffective().skeleton,index=new BoneIndex(source,SEMANTIC);
  const host=new THREE.Scene(),reflector=new MirrorReflector(THREE,host);
  reflector.attachBody(source);
  index.applyLocals(skel.locals);
  const root=new THREE.Group();const rw=skel.root_world;root.position.set(...rw.translation);root.quaternion.set(rw.rotation[0],rw.rotation[1],rw.rotation[2],rw.rotation[3]);root.scale.set(...(rw.scale||[1,1,1]));root.add(source);root.updateMatrixWorld(true);
  reflector.syncBodyPose(source,reflector.body);
  reflector.applyHouseholder(root,reflector.bodyCarrier,app.getEffective().mirror.centre,app.getEffective().mirror.basis.n);
  const original={};for(const id of Object.keys(SEMANTIC))original[id]=worldOf(THREE,index.get(id));
  const reflectedIndex=new BoneIndex(reflector.body,SEMANTIC);
  assert.notEqual(reflectedIndex.get("wrist_R"),index.get("wrist_R"),"reflection must own a detached skeleton");
  let skinned=0;reflector.body.traverse((o)=>{if(o.isSkinnedMesh){skinned++;assert.equal(o.bindMode,"detached");}});assert.ok(skinned>0);
  for(const id of Object.keys(SEMANTIC)){
    const got=worldOf(THREE,reflectedIndex.get(id));
    const want=reflectPoint(original[id],app.getEffective().mirror.centre,app.getEffective().mirror.basis.n);
    const d=Math.hypot(got[0]-want[0],got[1]-want[1],got[2]-want[2]);
    assert.ok(d<t("T-BONE-REG"),`${id} reflected Δ=${d} ${JSON.stringify({original:original[id],got,want,root:rw,mirror:app.getEffective().mirror.centre,n:app.getEffective().mirror.basis.n})}`);
  }
});

test("ACC-REF-02 · renderer clipping boundary agrees with finite aperture within T-CLIP",async()=>{
  const THREE=await import("three");const app=createApp(),eff=app.getEffective(),mirror=eff.mirror,C=eff.camera.world.translation,reflector=new MirrorReflector(THREE,new THREE.Scene());reflector.updateClip(eff);const eps=t("T-CLIP"),M=mirror.centre,u=mirror.basis.u,v=mirror.basis.v,hw=mirror.width_m/2,hh=mirror.height_m/2;
  const virtualFromHit=(H)=>add(H,sub(H,C));
  const samples=[];
  for(const s of [-1,1]){
    for(const inside of [true,false]){
      const du=s*(hw+(inside?-eps:eps));samples.push({inside,X:virtualFromHit(add(M,scale(u,du)))});
      const dv=s*(hh+(inside?-eps:eps));samples.push({inside,X:virtualFromHit(add(M,scale(v,dv)))});
    }
  }
  for(const row of samples){const rendered=reflector.insideClip(row.X);assert.equal(rendered,row.inside,`aperture boundary mismatch at ${JSON.stringify(row.X)}`);assert.equal(reflector.clipAgreesWithAperture(row.X,eff),true);}
});

test("ACC-RIG-01 · production boot path throws if its 24-joint assertion fails",()=>{const src=readFileSync(new URL("../src/render/scene_3d.js",import.meta.url),"utf8");assert.match(src,/ACC-RIG-01 boot assertion failed/);assert.match(src,/PICK_JOINTS\.length\s*!==\s*24/);assert.doesNotMatch(src,/console\.error\(["']failed to load rigged body GLB/);});
