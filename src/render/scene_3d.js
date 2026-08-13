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
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4, roughness: 0.4 }),
  );
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0x88aaff, side: THREE.DoubleSide }),
  );
  scene.add(phoneMesh);
  scene.add(screenMesh);

  const mirrorGroup = new THREE.Group();
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xcfd8dc,
    metalness: 0.8,
    roughness: 0.15,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const mirrorMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mirrorMat);
  mirrorGroup.add(mirrorMesh);
  scene.add(mirrorGroup);

  const bodyRoot = new THREE.Group();
  scene.add(bodyRoot);
  let gltfScene = null;
  const loader = new GLTFLoader();
  loader.load("fixtures/P0/base_female_rigged.glb", (gltf) => {
    gltfScene = gltf.scene;
    bodyRoot.add(gltf.scene);
  });

  function resize() {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  function xfToThree(xf) {
    return {
      p: xf.translation,
      q: xf.rotation,
    };
  }

  function sync() {
    const eff = app.getEffective();
    const req = app.getRequested();
    const dims = req.phone.body_dimensions_m;
    phoneMesh.scale.set(dims.width, dims.depth, dims.height);
    const pw = eff.phone.world;
    phoneMesh.position.set(...pw.translation);
    phoneMesh.quaternion.set(pw.rotation[0], pw.rotation[1], pw.rotation[2], pw.rotation[3]);
    const sc = eff.phone.screen_corners_world;
    if (sc?.length === 4) {
      const c = sc.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
      screenMesh.position.set(...c);
      screenMesh.quaternion.copy(phoneMesh.quaternion);
      screenMesh.scale.set(dims.width * 0.9, dims.height * 0.88, 1);
    }
    const mq = eff.mirror.quad;
    if (mq?.length === 4) {
      const c = mq.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
      mirrorMesh.position.set(...c);
      const b = eff.mirror.basis;
      const m = new THREE.Matrix4();
      m.makeBasis(
        new THREE.Vector3(...b.u),
        new THREE.Vector3(...b.v),
        new THREE.Vector3(...b.n),
      );
      mirrorMesh.quaternion.setFromRotationMatrix(m);
      mirrorMesh.scale.set(eff.mirror.width_m, eff.mirror.height_m, 1);
    }
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
    camera.fov = (camE.hfov * 180) / Math.PI / camera.aspect;
    camera.updateProjectionMatrix();
    const skel = eff.skeleton;
    if (gltfScene && skel?.locals) {
      gltfScene.traverse((obj) => {
        const local = skel.locals[obj.name];
        if (!local) return;
        obj.position.set(...local.translation);
        obj.quaternion.set(local.rotation[0], local.rotation[1], local.rotation[2], local.rotation[3]);
        obj.scale.set(...local.scale);
      });
    }
    const rootXf = skel?.world?.Root_01 || skel?.world?._rootJoint;
    if (rootXf) {
      bodyRoot.position.set(...rootXf.translation);
      bodyRoot.quaternion.set(rootXf.rotation[0], rootXf.rotation[1], rootXf.rotation[2], rootXf.rotation[3]);
    } else {
      const root = req.body.pose_targets.root;
      bodyRoot.position.set(...root.translation);
      bodyRoot.rotation.set(0, 0, root.yaw);
    }
    renderer.render(scene, camera);
  }

  return { sync, renderer, scene, camera, resize };
}
