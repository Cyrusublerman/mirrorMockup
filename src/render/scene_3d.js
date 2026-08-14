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

function pickRadius(id, fk) {
  const glb = SEMANTIC[id];
  let child = null;
  for (const other of PICK_JOINTS) {
    if (other === id) continue;
    if (BONE_PARENT[SEMANTIC[other]] === glb) {
      child = fk?.[other];
      break;
    }
  }
  const p = fk?.[id];
  if (p && child) {
    const len = Math.hypot(p[0] - child[0], p[1] - child[1], p[2] - child[2]);
    return Math.max(0.025, len * 0.35);
  }
  const parentName = BONE_PARENT[glb];
  if (p && parentName) {
    let parentFk = null;
    for (const [sem, g] of Object.entries(SEMANTIC)) {
      if (g === parentName) {
        parentFk = fk?.[sem];
        break;
      }
    }
    if (parentFk) {
      const len = Math.hypot(p[0] - parentFk[0], p[1] - parentFk[1], p[2] - parentFk[2]);
      return Math.max(0.025, len * 0.35);
    }
  }
  return 0.04;
}

function nearestJoint(point, fk) {
  let best = null;
  let bestD = Infinity;
  for (const id of PICK_JOINTS) {
    const p = fk?.[id];
    if (!p) continue;
    const d = Math.hypot(p[0] - point[0], p[1] - point[1], p[2] - point[2]);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best ? { kind: "joint", id: best } : { kind: "body", id: "body" };
}

export async function createScene3D(canvas, app, opts = {}) {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "default",
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.autoClear = true;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f5ef);
  const editorCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.02, 40);
  editorCam.up.set(0, 0, 1);
  editorCam.layers.enable(EDITOR_LAYER);
  const capture = new CaptureCamera(THREE);
  const framing = new FramingPolicy();
  const viewState = opts.viewState || new ViewState();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.15));
  const dir = new THREE.DirectionalLight(0xffffff, 0.75);
  dir.position.set(2, -2, 4);
  scene.add(dir);
  const grid = new THREE.GridHelper(4, 16, 0xcccccc, 0xeeeeee);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);

  const gnomon = new THREE.AxesHelper(0.18);
  gnomon.layers.set(EDITOR_LAYER);
  scene.add(gnomon);
  const viewLabel = { text: "ISO" };

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
  const reflector = new MirrorReflector(THREE, scene);
  const loader = new GLTFLoader();
  let gltfScene = null;
  let boneIndex = null;
  try {
    const glbRel = app.getRequested()?.body?.definition?.glb || "fixtures/P0/base_female_rigged.glb";
    const gltf = await loadGlb(loader, glbRel);
    gltfScene = gltf.scene;
    boneIndex = new BoneIndex(gltfScene, SEMANTIC);
    const fk0 = app.getEffective()?.skeleton?.fk;
    for (const id of PICK_JOINTS) {
      if (!fk0?.[id]) throw new Error(`pick joint missing FK ${id}`);
    }
    gltfScene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        obj.userData.pick = { kind: "body", id: "body" };
        obj.userData.riggedMaterial = obj.material;
      }
    });
    bodyRoot.add(gltfScene);
    reflector.attachBody(gltfScene);
  } catch (err) {
    console.error("failed to load rigged body GLB", err);
  }

  const boneGeo = new THREE.BufferGeometry();
  const boneLine = new THREE.LineSegments(boneGeo, new THREE.LineBasicMaterial({ color: 0x222222 }));
  scene.add(boneLine);
  reflector.attachStick(boneLine);

  const pickGroup = new THREE.Group();
  pickGroup.layers.set(EDITOR_LAYER);
  scene.add(pickGroup);
  const pickMats = {
    idle: new THREE.MeshBasicMaterial({ color: 0xd82d84, transparent: true, opacity: 0.18, depthTest: true }),
    hot: new THREE.MeshBasicMaterial({ color: 0xd82d84, transparent: true, opacity: 0.0, depthTest: true }),
  };
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd82d84, transparent: true, opacity: 0.95, depthTest: true, side: THREE.DoubleSide });
  const pickSpheres = {};
  const pickRings = {};
  for (const id of PICK_JOINTS) {
    const r = pickRadius(id, app.getEffective()?.skeleton?.fk);
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), pickMats.idle);
    s.userData.pick = { kind: "joint", id };
    s.layers.set(EDITOR_LAYER);
    s.renderOrder = 20;
    pickGroup.add(s);
    pickSpheres[id] = s;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.15, r * 0.08, 8, 24), ringMat);
    ring.visible = false;
    ring.layers.set(EDITOR_LAYER);
    pickGroup.add(ring);
    pickRings[id] = ring;
  }
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xd82d84, wireframe: true, transparent: true, opacity: 0.85 });
  const ghostSphere = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), ghostMat);
  ghostSphere.visible = false;
  ghostSphere.layers.set(EDITOR_LAYER);
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
  reflector.attachSimple(simpleGroup);
  reflector.attachPhone(phoneMesh, screenMesh);
  const silMat = new THREE.MeshBasicMaterial({ color: 0x181818, side: THREE.DoubleSide });

  const inset = opts.insetCanvas || null;
  const orbit = { theta: 0.7, phi: 1.15 };
  const room = { id: "POSE" };
  const frame = { target: [0, 0.9, 0.9], radius: 2.4, userScale: 1 };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let paneW = 800;
  let paneH = 600;

  function applyEditor(cam3, eff) {
    const fitted = room.id === "SCENE" ? framing.fitApparatus(eff) : framing.fitBody(eff.skeleton?.fk);
    frame.target = fitted.target;
    frame.radius = fitted.radius;
    const t = frame.target;
    const r = frame.radius * frame.userScale;
    const view = viewState.editor_view;
    viewLabel.text = view;
    if (view === "FRONT") cam3.position.set(t[0], t[1] - r, t[2]);
    else if (view === "BACK") cam3.position.set(t[0], t[1] + r, t[2]);
    else if (view === "LEFT") cam3.position.set(t[0] - r, t[1], t[2]);
    else if (view === "RIGHT") cam3.position.set(t[0] + r, t[1], t[2]);
    else if (view === "TOP") cam3.position.set(t[0], t[1], t[2] + r);
    else {
      cam3.position.set(
        t[0] + r * Math.sin(orbit.phi) * Math.sin(orbit.theta),
        t[1] - r * Math.sin(orbit.phi) * Math.cos(orbit.theta),
        t[2] + r * Math.cos(orbit.phi),
      );
    }
    cam3.up.set(0, 0, 1);
    cam3.lookAt(t[0], t[1], t[2]);
    const half = r * 0.55;
    const aspect = cam3.right !== undefined ? (paneW / Math.max(paneH, 1)) : 1;
    cam3.left = -half * aspect;
    cam3.right = half * aspect;
    cam3.top = half;
    cam3.bottom = -half;
    cam3.updateProjectionMatrix();
    gnomon.position.set(t[0], t[1], t[2]);
  }

  function syncMeshes(eff, req) {
    const prism = eff.phone.mesh;
    if (prism?.positions) {
      if (phoneMesh.geometry.getAttribute("position")?.count !== prism.positions.length) {
        phoneMesh.geometry.dispose();
        phoneMesh.geometry = geometryFromMesh(THREE, prism);
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
      bodyRoot.matrixAutoUpdate = true;
      bodyRoot.position.set(...rootXf.translation);
      bodyRoot.quaternion.set(rootXf.rotation[0], rootXf.rotation[1], rootXf.rotation[2], rootXf.rotation[3]);
      bodyRoot.scale.set(...(rootXf.scale || [1, 1, 1]));
    }
    if (gltfScene && skel?.locals && boneIndex) {
      boneIndex.applyLocals(skel.locals);
      gltfScene.updateMatrixWorld(true);
      gltfScene.traverse((obj) => {
        if (obj.isSkinnedMesh && obj.skeleton) obj.skeleton.update();
      });
    }
    bodyRoot.updateMatrixWorld(true);
    reflector.update(eff, { bodyRoot, phoneMesh, stick: boneLine, simple: simpleGroup });

    const sel = req.workspace.selection;
    for (const id of PICK_JOINTS) {
      const p = skel?.fk?.[id];
      const sph = pickSpheres[id];
      const ring = pickRings[id];
      if (!p || !sph) continue;
      sph.position.set(...p);
      const on = sel === id || sel === `joint:${id}`;
      sph.material = on ? pickMats.hot : pickMats.idle;
      sph.visible = true;
      if (ring) {
        ring.visible = on;
        ring.position.set(...p);
      }
    }
    const want = req.body?.pose_targets?.endpoint_targets?.wrist_R;
    const got = skel?.fk?.wrist_R;
    if (want && got) {
      const far = Math.hypot(want[0] - got[0], want[1] - got[1], want[2] - got[2]) > 0.03;
      ghostSphere.visible = far;
      if (far) ghostSphere.position.set(...want);
    } else ghostSphere.visible = false;
    const stick = bodyMode.kind === "STICK";
    const simple = bodyMode.kind === "SIMPLE";
    const sil = bodyMode.kind === "SILHOUETTE";
    if (gltfScene) {
      gltfScene.visible = bodyMode.kind === "RIGGED" || sil;
      gltfScene.traverse((o) => {
        if (!o.isMesh) return;
        o.material = sil ? silMat : (o.userData.riggedMaterial || o.material);
      });
    }
    boneLine.visible = stick || !!req.workspace.overlays?.SKELETON;
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

  function renderPane(cam, x, y, w, h) {
    renderer.setViewport(x, y, w, h);
    renderer.setScissor(x, y, w, h);
    renderer.setScissorTest(true);
    renderer.render(scene, cam);
  }

  function renderCameras(eff) {
    const parent = canvas.parentElement;
    paneW = Math.max(1, canvas.clientWidth || parent?.clientWidth || 800);
    paneH = Math.max(1, canvas.clientHeight || parent?.clientHeight || 600);
    renderer.setSize(paneW, paneH, false);
    const mainCapture = viewState.main_pane === "CAPTURE";
    grid.visible = !mainCapture;
    pickGroup.visible = !mainCapture;
    gnomon.visible = !mainCapture;
    applyEditor(editorCam, eff);
    capture.apply(eff);
    const capCam = capture.cam;
    const insetBox = letterboxRect(Math.max(88, paneW * 0.22), Math.max(120, paneH * 0.28), 3 / 4);
    if (mainCapture) {
      const box = letterboxRect(paneW, paneH, 3 / 4);
      renderer.setClearColor(0x111111, 1);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, paneW, paneH);
      renderer.clear();
      renderPane(capCam, box.x, box.y, box.w, box.h);
    } else {
      renderer.setClearColor(0xf7f5ef, 1);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, paneW, paneH);
      renderer.clear();
      renderPane(editorCam, 0, 0, paneW, paneH);
    }
    renderer.setScissorTest(false);
    if (inset) {
      const iw = Math.max(1, Math.floor(inset.clientWidth || 120));
      const ih = Math.max(1, Math.floor(inset.clientHeight || 160));
      const ix = paneW - iw - 8;
      const iy = 8;
      const insetCam = mainCapture ? editorCam : capCam;
      grid.visible = mainCapture;
      pickGroup.visible = mainCapture;
      renderPane(insetCam, ix, iy, iw, ih);
      grid.visible = !mainCapture;
      pickGroup.visible = !mainCapture;
    }
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, paneW, paneH);
  }

  function resize() {
    const parent = canvas.parentElement;
    paneW = Math.max(1, canvas.clientWidth || parent?.clientWidth || 800);
    paneH = Math.max(1, canvas.clientHeight || parent?.clientHeight || 600);
    renderer.setSize(paneW, paneH, false);
  }

  function sync() {
    const eff = app.getEffective();
    const req = app.getRequested();
    syncMeshes(eff, req);
    renderCameras(eff);
  }

  function hitTest(clientX, clientY, targetCam, viewRect) {
    const cam = targetCam || (viewState.main_pane === "CAPTURE" ? capture.cam : editorCam);
    const rect = viewRect || canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, cam);
    const objs = [...Object.values(pickSpheres), phoneMesh, mirrorMesh3];
    if (gltfScene) objs.push(gltfScene);
    const hits = raycaster.intersectObjects(objs, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.pick) o = o.parent;
      if (!o?.userData.pick) continue;
      const pick = o.userData.pick;
      if (pick.kind === "body") {
        const j = nearestJoint([h.point.x, h.point.y, h.point.z], app.getEffective().skeleton.fk);
        return { ...j, point: [h.point.x, h.point.y, h.point.z], world: h.point };
      }
      return { ...pick, point: [h.point.x, h.point.y, h.point.z], world: h.point };
    }
    return null;
  }

  function orbitBy(dx, dy) {
    orbit.theta += dx * 0.01;
    orbit.phi = Math.min(2.8, Math.max(0.2, orbit.phi + dy * 0.01));
  }

  function dolly(factor) {
    frame.userScale = Math.min(6, Math.max(0.25, frame.userScale * factor));
  }

  function setEditorView(name) {
    if (name === "CAMERA" || name === "SIDE") {
      if (name === "CAMERA") viewState.setMainPane("CAPTURE");
      else viewState.setEditorView("RIGHT");
      return;
    }
    if (EDITOR_VIEWS.includes(name)) {
      viewState.setEditorView(name);
      viewState.setMainPane("EDITOR");
    }
  }

  function swapInset() {
    viewState.swap();
  }

  function dragDeltaWorld(dx, dy, scale = 0.0022) {
    const cam = viewState.main_pane === "CAPTURE" ? capture.cam : editorCam;
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    cam.matrixWorld.extractBasis(right, up, fwd);
    return [
      right.x * dx * scale + up.x * -dy * scale,
      right.y * dx * scale + up.y * -dy * scale,
      right.z * dx * scale + up.z * -dy * scale,
    ];
  }

  resize();
  if (typeof window !== "undefined") window.addEventListener("resize", resize);
  return {
    sync,
    resize,
    renderer,
    scene,
    camera: editorCam,
    capture,
    reflector,
    hitTest,
    orbit: orbitBy,
    dolly,
    setEditorView,
    swapInset,
    dragDeltaWorld,
    setBodyMode: (kind) => {
      bodyMode.kind = kind;
    },
    setRoom: (id) => {
      room.id = id;
      frame.userScale = 1;
    },
    viewState,
    viewLabel,
    workspace: {
      get editor_view() {
        return viewState.main_pane === "CAPTURE" ? "CAMERA" : viewState.editor_view;
      },
      set editor_view(v) {
        setEditorView(v);
      },
    },
    SEMANTIC,
    boneIndex,
  };
}
