import { BONE_PARENT, SEMANTIC } from "../domains/body/skeleton.js";
import { renderField } from "../domains/export/image.js";
import { activeOverlays } from "./overlays.js";
import { reflectPoint } from "../domains/reflection/reflect.js";

function geometryFromMesh(THREE, mesh) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(mesh.positions.length * 3);
  for (let i = 0; i < mesh.positions.length; i++) {
    pos[i * 3] = mesh.positions[i][0];
    pos[i * 3 + 1] = mesh.positions[i][1];
    pos[i * 3 + 2] = mesh.positions[i][2];
  }
  const idx = [];
  for (const t of mesh.triangles) idx.push(t[0], t[1], t[2]);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function writePositions(geo, positions) {
  const arr = geo.getAttribute("position").array;
  for (let i = 0; i < positions.length; i++) {
    arr[i * 3] = positions[i][0];
    arr[i * 3 + 1] = positions[i][1];
    arr[i * 3 + 2] = positions[i][2];
  }
  geo.getAttribute("position").needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}

function repoRootUrl() {
  return new URL("../../", import.meta.url);
}

function glbCandidates(rel) {
  const path = rel.replace(/^\.\//, "");
  const out = [];
  if (/^(https?:|blob:|data:)/i.test(path)) return [path];
  out.push(new URL(path, repoRootUrl()).href);
  if (globalThis.MIRROR_REPO) out.push(new URL(path, String(globalThis.MIRROR_REPO).replace(/\/?$/, "/")).href);
  if (typeof document !== "undefined" && document.baseURI) out.push(new URL(path, document.baseURI).href);
  out.push(path);
  return [...new Set(out)];
}

async function loadGlb(loader, rel) {
  let last = null;
  for (const url of glbCandidates(rel)) {
    try {
      return await loader.loadAsync(url);
    } catch (err) {
      last = err;
    }
  }
  throw last || new Error("glb not found");
}

const PICK_JOINTS = ["head", "pelvis", "wrist_R", "wrist_L", "ankle_L", "ankle_R", "elbow_R", "shoulder_R", "spine"];

export async function createScene3D(canvas, app, opts = {}) {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "default",
    failIfMajorPerformanceCaveat: false,
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.autoClear = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f5ef);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.02, 40);
  camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.15));
  const dir = new THREE.DirectionalLight(0xffffff, 0.75);
  dir.position.set(2, -2, 4);
  scene.add(dir);
  const grid = new THREE.GridHelper(4, 16, 0xcccccc, 0xeeeeee);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  const phoneMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.35, roughness: 0.45, side: THREE.DoubleSide }),
  );
  phoneMesh.userData.pick = { kind: "phone" };
  const screenMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x8eb4ff, side: THREE.DoubleSide }),
  );
  const fieldTex = new THREE.DataTexture(new Uint8Array(64 * 64 * 4), 64, 64, THREE.RGBAFormat);
  fieldTex.needsUpdate = true;
  fieldTex.flipY = true;
  screenMesh.material.map = fieldTex;
  screenMesh.material.needsUpdate = true;
  phoneMesh.add(screenMesh);
  scene.add(phoneMesh);

  const phoneRefl = phoneMesh.clone(true);
  phoneRefl.material = phoneMesh.material.clone();
  phoneRefl.material.opacity = 0.55;
  phoneRefl.material.transparent = true;
  scene.add(phoneRefl);

  const mirrorMesh3 = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0xc5d0d8,
      metalness: 0.9,
      roughness: 0.08,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    }),
  );
  mirrorMesh3.userData.pick = { kind: "mirror" };
  scene.add(mirrorMesh3);

  const bodyRoot = new THREE.Group();
  scene.add(bodyRoot);
  const bodyRefl = new THREE.Group();
  scene.add(bodyRefl);
  const loader = new GLTFLoader();
  let gltfScene = null;
  let gltfRefl = null;
  try {
    const glbRel = app.getRequested()?.body?.definition?.glb || "fixtures/P0/base_female_rigged.glb";
    const gltf = await loadGlb(loader, glbRel);
    gltfScene = gltf.scene;
    gltfScene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        obj.userData.pick = { kind: "body", id: "body" };
      }
    });
    bodyRoot.add(gltfScene);
    gltfRefl = gltfScene.clone(true);
    gltfRefl.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        obj.material = obj.material.clone();
        obj.material.transparent = true;
        obj.material.opacity = 0.45;
      }
    });
    bodyRefl.add(gltfRefl);
  } catch (err) {
    console.error("failed to load rigged body GLB", err);
  }

  const boneGeo = new THREE.BufferGeometry();
  const boneLine = new THREE.LineSegments(boneGeo, new THREE.LineBasicMaterial({ color: 0x222222 }));
  scene.add(boneLine);

  const pickGroup = new THREE.Group();
  scene.add(pickGroup);
  const pickMats = {
    idle: new THREE.MeshBasicMaterial({ color: 0xd82d84, transparent: true, opacity: 0.0, depthTest: false }),
    hot: new THREE.MeshBasicMaterial({ color: 0xd82d84, transparent: true, opacity: 0.4, depthTest: false }),
  };
  const pickSpheres = {};
  for (const id of PICK_JOINTS) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), pickMats.idle);
    s.userData.pick = { kind: "joint", id };
    s.renderOrder = 20;
    pickGroup.add(s);
    pickSpheres[id] = s;
  }
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xd82d84, wireframe: true, transparent: true, opacity: 0.85 });
  const ghostSphere = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), ghostMat);
  ghostSphere.visible = false;
  scene.add(ghostSphere);
  const bodyMode = { kind: "RIGGED" };
  const simpleGroup = new THREE.Group();
  scene.add(simpleGroup);
  const simpleMat = new THREE.MeshBasicMaterial({ color: 0x181818 });
  const simpleParts = ["pelvis", "head", "wrist_L", "wrist_R", "ankle_L", "ankle_R"].map((id) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(id === "head" ? 0.11 : 0.07, 10, 8), simpleMat);
    m.userData.fk = id;
    simpleGroup.add(m);
    return m;
  });
  const silMat = new THREE.MeshBasicMaterial({ color: 0x181818, side: THREE.DoubleSide });

  const inset = opts.insetCanvas || null;
  const insetCtx = inset ? inset.getContext("2d") : null;
  const insetCam = new THREE.PerspectiveCamera(50, 1, 0.02, 40);
  insetCam.up.set(0, 0, 1);

  const workspace = {
    editor_view: "ISO",
    inset_is_capture: true,
    orbit: { theta: 0.7, phi: 1.15, radius: 2.6, target: [0, 0.9, 0.9] },
  };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function sizeOf(el, cam, rnd) {
    const parent = el.parentElement;
    const w = Math.max(1, el.clientWidth || parent?.clientWidth || 800);
    const h = Math.max(1, el.clientHeight || parent?.clientHeight || 600);
    rnd.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    return [w, h];
  }

  function applyCapture(cam3, camE) {
    const xf = camE?.world;
    if (!xf?.translation || !xf.rotation) return;
    cam3.position.set(...xf.translation);
    cam3.quaternion.set(xf.rotation[0], xf.rotation[1], xf.rotation[2], xf.rotation[3]);
    if (camE.basis?.up) cam3.up.set(...camE.basis.up);
    cam3.fov = ((camE.hfov || Math.PI / 3) * 180) / Math.PI / Math.max(cam3.aspect, 0.2);
    cam3.updateProjectionMatrix();
  }

  function applyEditor(cam3, skel) {
    const t = workspace.orbit.target;
    const pelvis = skel?.fk?.pelvis;
    if (pelvis) {
      t[0] = pelvis[0];
      t[1] = pelvis[1];
      t[2] = pelvis[2];
    }
    const view = workspace.editor_view;
    if (view === "FRONT") cam3.position.set(t[0], t[1] - 2.4, t[2] + 0.2);
    else if (view === "SIDE") cam3.position.set(t[0] + 2.4, t[1], t[2] + 0.2);
    else if (view === "TOP") cam3.position.set(t[0], t[1], t[2] + 2.6);
    else {
      const o = workspace.orbit;
      cam3.position.set(
        t[0] + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
        t[1] - o.radius * Math.sin(o.phi) * Math.cos(o.theta),
        t[2] + o.radius * Math.cos(o.phi),
      );
    }
    cam3.up.set(0, 0, 1);
    cam3.lookAt(t[0], t[1], t[2]);
    cam3.fov = 42;
    cam3.updateProjectionMatrix();
  }

  function reflectMesh(src, dst, centre, n) {
    dst.position.set(...reflectPoint([src.position.x, src.position.y, src.position.z], centre, n));
    dst.quaternion.copy(src.quaternion);
    dst.visible = src.visible;
  }

  function syncMeshes(eff, req) {
    const vis = activeOverlays(req);
    const prism = eff.phone.mesh;
    if (prism?.positions) {
      if (phoneMesh.geometry.getAttribute("position")?.count !== prism.positions.length) {
        phoneMesh.geometry.dispose();
        phoneMesh.geometry = geometryFromMesh(THREE, prism);
        phoneRefl.geometry = phoneMesh.geometry;
      } else writePositions(phoneMesh.geometry, prism.positions);
    }
    const screen = eff.phone.screen_mesh;
    if (screen?.positions) {
      if (screenMesh.geometry.getAttribute("position")?.count !== screen.positions.length) {
        screenMesh.geometry.dispose();
        screenMesh.geometry = geometryFromMesh(THREE, screen);
      } else writePositions(screenMesh.geometry, screen.positions);
    }
    const pw = eff.phone.world;
    phoneMesh.position.set(...pw.translation);
    phoneMesh.quaternion.set(pw.rotation[0], pw.rotation[1], pw.rotation[2], pw.rotation[3]);
    phoneMesh.visible = true;
    const field = renderField(eff, req, 64, 64);
    if (field?.rgba?.length === fieldTex.image.data.length) {
      fieldTex.image.data.set(field.rgba);
      fieldTex.needsUpdate = true;
    }

    const mm = eff.mirror.mesh;
    if (mm?.positions) {
      if (mirrorMesh3.geometry.getAttribute("position")?.count !== mm.positions.length) {
        mirrorMesh3.geometry.dispose();
        mirrorMesh3.geometry = geometryFromMesh(THREE, mm);
      } else writePositions(mirrorMesh3.geometry, mm.positions);
    }
    mirrorMesh3.position.set(0, 0, 0);
    mirrorMesh3.quaternion.identity();
    mirrorMesh3.visible = true;

    const skel = eff.skeleton;
    const rootXf = skel?.root_world;
    if (rootXf) {
      bodyRoot.position.set(...rootXf.translation);
      bodyRoot.quaternion.set(rootXf.rotation[0], rootXf.rotation[1], rootXf.rotation[2], rootXf.rotation[3]);
      bodyRoot.scale.set(...(rootXf.scale || [1, 1, 1]));
    }
    if (gltfScene && skel?.locals) {
      gltfScene.traverse((obj) => {
        const local = skel.locals[obj.name];
        if (!local) return;
        obj.position.set(...local.translation);
        obj.quaternion.set(local.rotation[0], local.rotation[1], local.rotation[2], local.rotation[3]);
        obj.scale.set(...local.scale);
      });
      gltfScene.updateMatrixWorld(true);
      if (gltfRefl) {
        gltfRefl.traverse((obj) => {
          const src = gltfScene.getObjectByName(obj.name);
          if (!src) return;
          obj.position.copy(src.position);
          obj.quaternion.copy(src.quaternion);
          obj.scale.copy(src.scale);
        });
      }
    }

    const M = eff.mirror.centre;
    const n = eff.mirror.basis.n;
    reflectMesh(phoneMesh, phoneRefl, M, n);
    if (rootXf) {
      bodyRefl.position.set(...reflectPoint(rootXf.translation, M, n));
      bodyRefl.quaternion.set(rootXf.rotation[0], rootXf.rotation[1], rootXf.rotation[2], rootXf.rotation[3]);
      bodyRefl.scale.x = -(rootXf.scale?.[0] || 1);
      bodyRefl.scale.y = rootXf.scale?.[1] || 1;
      bodyRefl.scale.z = rootXf.scale?.[2] || 1;
    }

    const sel = req.workspace.selection;
    for (const id of PICK_JOINTS) {
      const p = skel?.fk?.[id];
      const sph = pickSpheres[id];
      if (!p || !sph) continue;
      sph.position.set(...p);
      sph.material = sel === id || sel === `joint:${id}` ? pickMats.hot : pickMats.idle;
      sph.visible = true;
    }
    const want = req.body?.pose_targets?.endpoint_targets?.wrist_R;
    const got = skel?.fk?.wrist_R;
    if (want && got) {
      const dx = want[0] - got[0], dy = want[1] - got[1], dz = want[2] - got[2];
      const far = Math.hypot(dx, dy, dz) > 0.03;
      ghostSphere.visible = far;
      if (far) ghostSphere.position.set(...want);
    } else ghostSphere.visible = false;
    const stick = bodyMode.kind === "STICK";
    const simple = bodyMode.kind === "SIMPLE";
    const sil = bodyMode.kind === "SILHOUETTE";
    if (gltfScene) {
      gltfScene.visible = bodyMode.kind === "RIGGED" || sil;
      if (sil) gltfScene.traverse((o) => { if (o.isMesh) o.material = silMat; });
    }
    if (gltfRefl) gltfRefl.visible = bodyMode.kind === "RIGGED" || sil;
    boneLine.visible = stick || !!vis.SKELETON;
    simpleGroup.visible = simple;
    if (simple && skel?.fk) {
      for (const m of simpleParts) {
        const p = skel.fk[m.userData.fk];
        m.visible = !!p;
        if (p) m.position.set(...p);
      }
    }
    if (boneLine.visible && skel?.world) {
      const pts = [];
      for (const [name, xf] of Object.entries(skel.world)) {
        const parent = BONE_PARENT[name];
        const px = parent && skel.world[parent];
        if (!px) continue;
        pts.push(...px.translation, ...xf.translation);
      }
      boneGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    }
  }

  function blitInset(eff, mainIsCapture) {
    if (!inset || !insetCtx) return;
    const parent = inset.parentElement;
    const iw = Math.max(1, Math.floor(inset.clientWidth || parent?.clientWidth || 120));
    const ih = Math.max(1, Math.floor(inset.clientHeight || parent?.clientHeight || 160));
    if (workspace.inset_is_capture || !mainIsCapture) applyCapture(insetCam, eff.camera);
    else applyEditor(insetCam, eff.skeleton);
    insetCam.aspect = iw / ih;
    insetCam.updateProjectionMatrix();
    renderer.setSize(iw, ih, false);
    renderer.render(scene, insetCam);
    if (inset.width !== iw) inset.width = iw;
    if (inset.height !== ih) inset.height = ih;
    insetCtx.drawImage(renderer.domElement, 0, 0, iw, ih);
    sizeOf(canvas, camera, renderer);
  }

  function renderCameras(eff) {
    const mainIsCapture = workspace.editor_view === "CAMERA";
    blitInset(eff, mainIsCapture);
    if (mainIsCapture) applyCapture(camera, eff.camera);
    else applyEditor(camera, eff.skeleton);
    renderer.render(scene, camera);
  }

  function resize() {
    sizeOf(canvas, camera, renderer);
  }

  function sync() {
    resize();
    const eff = app.getEffective();
    const req = app.getRequested();
    syncMeshes(eff, req);
    renderCameras(eff);
  }

  function hitTest(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const objs = [...Object.values(pickSpheres), phoneMesh, mirrorMesh3];
    if (gltfScene) objs.push(gltfScene);
    const hits = raycaster.intersectObjects(objs, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.pick) o = o.parent;
      if (o?.userData.pick) return { ...o.userData.pick, point: [h.point.x, h.point.y, h.point.z], world: h.point };
    }
    return null;
  }

  function orbit(dx, dy) {
    workspace.orbit.theta += dx * 0.01;
    workspace.orbit.phi = Math.min(2.8, Math.max(0.2, workspace.orbit.phi + dy * 0.01));
  }

  function dolly(factor) {
    workspace.orbit.radius = Math.min(8, Math.max(0.6, workspace.orbit.radius * factor));
  }

  function setEditorView(name) {
    workspace.editor_view = name;
  }

  function swapInset() {
    if (workspace.editor_view === "CAMERA") workspace.editor_view = "ISO";
    else workspace.editor_view = "CAMERA";
  }

  function dragDeltaWorld(dx, dy, scale = 0.0022) {
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    camera.matrixWorld.extractBasis(right, up, fwd);
    return [
      right.x * dx * scale + up.x * -dy * scale,
      right.y * dx * scale + up.y * -dy * scale,
      right.z * dx * scale + up.z * -dy * scale,
    ];
  }

  function setBodyMode(kind) {
    bodyMode.kind = kind;
  }

  resize();
  window.addEventListener("resize", resize);
  return {
    sync,
    resize,
    renderer,
    scene,
    camera,
    hitTest,
    orbit,
    dolly,
    setEditorView,
    swapInset,
    dragDeltaWorld,
    setBodyMode,
    workspace,
    SEMANTIC,
  };
}
