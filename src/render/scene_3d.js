import { BONE_PARENT } from "../domains/body/skeleton.js";
import { renderField } from "../domains/export/image.js";

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

export async function createScene3D(canvas, app) {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f1ea);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.02, 40);
  camera.up.set(0, 0, 1);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(2, -2, 4);
  scene.add(dir);
  scene.add(new THREE.GridHelper(4, 16, 0xcccccc, 0xeeeeee));

  const phoneMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.35,
      roughness: 0.45,
      side: THREE.DoubleSide,
    }),
  );
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
      color: 0xcfd8dc,
      metalness: 0.85,
      roughness: 0.12,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  scene.add(mirrorMesh3);

  const bodyRoot = new THREE.Group();
  scene.add(bodyRoot);
  const loader = new GLTFLoader();
  let gltfScene = null;
  try {
    const gltf = await loader.loadAsync("fixtures/P0/base_female_rigged.glb");
    gltfScene = gltf.scene;
    gltfScene.traverse((obj) => {
      if (obj.isMesh) obj.frustumCulled = false;
    });
    bodyRoot.add(gltfScene);
  } catch (err) {
    console.error("failed to load rigged body GLB", err);
  }

  const boneGeo = new THREE.BufferGeometry();
  const boneLine = new THREE.LineSegments(
    boneGeo,
    new THREE.LineBasicMaterial({ color: 0x222222 }),
  );
  scene.add(boneLine);

  function resize() {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  function sync() {
    const eff = app.getEffective();
    const req = app.getRequested();

    const prism = eff.phone.mesh;
    if (prism?.positions) {
      if (phoneMesh.geometry.getAttribute("position")?.count !== prism.positions.length) {
        phoneMesh.geometry.dispose();
        phoneMesh.geometry = geometryFromMesh(THREE, prism);
      } else {
        writePositions(phoneMesh.geometry, prism.positions);
      }
    }
    const screen = eff.phone.screen_mesh;
    if (screen?.positions) {
      if (screenMesh.geometry.getAttribute("position")?.count !== screen.positions.length) {
        screenMesh.geometry.dispose();
        screenMesh.geometry = geometryFromMesh(THREE, screen);
      } else {
        writePositions(screenMesh.geometry, screen.positions);
      }
    }
    const pw = eff.phone.world;
    phoneMesh.position.set(...pw.translation);
    phoneMesh.quaternion.set(pw.rotation[0], pw.rotation[1], pw.rotation[2], pw.rotation[3]);
    phoneMesh.scale.set(1, 1, 1);
    phoneMesh.visible = !!req.workspace.overlays.PHONE;

    const field = renderField(eff, req, 64, 64);
    fieldTex.image.data.set(field.rgba);
    fieldTex.needsUpdate = true;

    const mm = eff.mirror.mesh;
    if (mm?.positions) {
      if (mirrorMesh3.geometry.getAttribute("position")?.count !== mm.positions.length) {
        mirrorMesh3.geometry.dispose();
        mirrorMesh3.geometry = geometryFromMesh(THREE, mm);
      } else {
        writePositions(mirrorMesh3.geometry, mm.positions);
      }
    }
    mirrorMesh3.position.set(0, 0, 0);
    mirrorMesh3.quaternion.identity();
    mirrorMesh3.visible = !!req.workspace.overlays.MIRROR;

    const view = eff.view;
    const camE = eff.camera;
    camera.position.set(...view.translation);
    const look = [
      view.translation[0] + camE.basis.forward[0],
      view.translation[1] + camE.basis.forward[1],
      view.translation[2] + camE.basis.forward[2],
    ];
    camera.up.set(...camE.basis.up);
    camera.lookAt(...look);
    const hfov = view.hfov || camE.hfov;
    camera.fov = (hfov * 180) / Math.PI / camera.aspect;
    camera.updateProjectionMatrix();

    const skel = eff.skeleton;
    const rootXf = skel?.root_world || skel?.world?._rootJoint;
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
    }

    const showSkel = !!req.workspace.overlays.SKELETON;
    boneLine.visible = showSkel;
    if (showSkel && skel?.world) {
      const pts = [];
      for (const [name, xf] of Object.entries(skel.world)) {
        const parent = BONE_PARENT[name];
        const px = parent && skel.world[parent];
        if (!px) continue;
        pts.push(...px.translation, ...xf.translation);
      }
      boneGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    }

    renderer.render(scene, camera);
  }

  return { sync, renderer, scene, camera, resize };
}
