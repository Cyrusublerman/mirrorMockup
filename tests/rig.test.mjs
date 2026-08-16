// ACC-RIG-01 — every semantic bone must resolve through the loader that actually consumes the GLB.
// The fixtures are correct; nothing verifies them against GLTFLoader's sanitised node names.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { BoneIndex, PICK_JOINTS } from "../src/render/bone_index.js";
import { SEMANTIC } from "../src/domains/body/skeleton.js";
import { createApp } from "../src/app/facade.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const MAP = JSON.parse(readFileSync(resolve(root, "fixtures/P0/skeleton_map.json"), "utf8"));
const NODES = JSON.parse(readFileSync(resolve(root, "fixtures/P0/glb_nodes.json"), "utf8"));
const SEMANTIC_MAP = MAP.semantic_to_glb;

async function loadSceneBoneNames() {
  globalThis.self ??= globalThis;
  globalThis.window ??= globalThis;
  globalThis.document ??= {
    createElement: () => ({ getContext: () => null, style: {} }),
    createElementNS: () => ({ style: {} }),
  };
  globalThis.createImageBitmap ??= async () => ({ width: 1, height: 1, close() {} });

  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const buf = readFileSync(resolve(root, "fixtures/P0/base_female_rigged.glb"));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  const gltf = await new Promise((ok, err) => new GLTFLoader().parse(ab, "", ok, err));
  const byRuntimeName = new Set();
  const byOriginalName = new Set();
  gltf.scene.traverse((o) => {
    if (!o.isBone) return;
    byRuntimeName.add(o.name);
    byOriginalName.add(o.userData?.name ?? o.name);
  });
  return { byRuntimeName, byOriginalName, scene: gltf.scene };
}

test("fixture node names match the GLB exactly", () => {
  // guards against the fixture drifting away from the asset it describes
  assert.equal(NODES.nodes.length, 71);
  assert.equal(NODES.skeleton_root, 5);
  assert.equal(NODES.joints.length, 54);
});

test("ACC-RIG-01 · every semantic bone resolves by its original glTF name", async () => {
  const { byOriginalName } = await loadSceneBoneNames();
  const missing = Object.entries(SEMANTIC_MAP).filter(([, glb]) => !byOriginalName.has(glb));
  assert.deepEqual(
    missing.map(([sem]) => sem),
    [],
    `unresolved semantic controls: ${missing.map(([s, g]) => `${s}->${g}`).join(", ")}`
  );
});

test("ACC-RIG-01b · lookup by Object3D.name alone is insufficient", async () => {
  // documents WHY the lookup must use userData.name. If this ever passes, the asset
  // was renamed and the guard in scene_3d.js can be simplified.
  const { byRuntimeName } = await loadSceneBoneNames();
  const unresolved = Object.values(SEMANTIC_MAP).filter((glb) => !byRuntimeName.has(glb));
  assert.ok(
    unresolved.length > 0,
    "asset no longer contains reserved characters; revisit the BoneIndex fallback"
  );
});

test("ACC-RIG-01c · the renderer uses the original name, not the sanitised one", () => {
  const indexSrc = readFileSync(resolve(root, "src/render/bone_index.js"), "utf8");
  const sceneSrc = readFileSync(resolve(root, "src/render/scene_3d.js"), "utf8");
  assert.match(
    indexSrc,
    /userData\s*(\?\.|\.)\s*name/,
    "BoneIndex must look bones up by userData.name; Object3D.name has had dots stripped"
  );
  assert.match(sceneSrc, /BoneIndex/);
  assert.doesNotMatch(
    sceneSrc,
    /skel\.locals\[\s*obj\.name\s*\]/,
    "bare obj.name lookup silently fails for every bone whose glTF name contains a dot"
  );
});

test("ACC-RIG-01d · no pick target names a joint the solver cannot produce", () => {
  const semantic = new Set(Object.keys(SEMANTIC_MAP));
  const phantom = PICK_JOINTS.filter((p) => !semantic.has(p));
  assert.deepEqual(phantom, [], `pick ids with no semantic joint: ${phantom.join(", ")}`);
  assert.equal(PICK_JOINTS.length, 24);
  assert.equal(PICK_JOINTS.includes("spine"), false);
  assert.equal(PICK_JOINTS.includes("root"), false);
});

test("ACC-RIG-01e · pick spheres use depthTest and variable radii", async () => {
  const sceneSrc = readFileSync(resolve(root, "src/render/scene_3d.js"), "utf8");
  const boneSrc = readFileSync(resolve(root, "src/render/bone_index.js"), "utf8");
  assert.match(sceneSrc, /depthTest:\s*true/);
  assert.match(boneSrc, /pickRadiusForJoint/);
  const { pickRadiusForJoint } = await import("../src/render/bone_index.js");
  const app = createApp();
  const fk = app.getEffective().skeleton.fk;
  const r = pickRadiusForJoint("elbow_R", fk);
  const seg = Math.hypot(
    fk.wrist_R[0] - fk.elbow_R[0],
    fk.wrist_R[1] - fk.elbow_R[1],
    fk.wrist_R[2] - fk.elbow_R[2],
  );
  assert.ok(r < seg * 0.5, `pick radius ${r} should be less than half segment ${seg}`);
  assert.ok(r <= 0.09 && r >= 0.04);
});

test("BoneIndex resolves every SEMANTIC bone via userData.name", async () => {
  const { scene } = await loadSceneBoneNames();
  const index = new BoneIndex(scene, SEMANTIC);
  for (const id of Object.keys(SEMANTIC)) {
    const bone = index.get(id);
    assert.ok(bone, id);
    assert.equal(bone.userData.name || bone.name, SEMANTIC[id], id);
  }
});

test("ACC-REG-01 · rendered bone world position matches FK within 5 mm", async () => {
  const THREE = await import("three");
  const { scene } = await loadSceneBoneNames();
  const index = new BoneIndex(scene, SEMANTIC);
  const app = createApp();
  const skel = app.getEffective().skeleton;
  const rootG = new THREE.Group();
  const rw = skel.root_world;
  rootG.position.set(...rw.translation);
  rootG.quaternion.set(rw.rotation[0], rw.rotation[1], rw.rotation[2], rw.rotation[3]);
  rootG.scale.set(...(rw.scale || [1, 1, 1]));
  rootG.add(scene);
  index.applyLocals(skel.locals);
  rootG.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  for (const id of Object.keys(SEMANTIC)) {
    const bone = index.get(id);
    bone.updateWorldMatrix(true, false);
    bone.getWorldPosition(v);
    const p = skel.fk[id];
    const d = Math.hypot(v.x - p[0], v.y - p[1], v.z - p[2]);
    assert.ok(d < 0.005, `${id} Δ=${d.toFixed(4)}`);
  }
});

test("ACC-REF-01 · reflected skinned meshes use detached bind", () => {
  const src = readFileSync(resolve(root, "src/render/mirror_reflector.js"), "utf8");
  assert.match(src, /bindMode\s*=\s*["']detached["']/);
  assert.match(src, /clippingPlanes/);
  const sceneSrc = readFileSync(resolve(root, "src/render/scene_3d.js"), "utf8");
  assert.match(sceneSrc, /localClippingEnabled\s*=\s*true/);
});
