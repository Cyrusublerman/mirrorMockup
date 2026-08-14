import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BoneIndex, PICK_JOINTS } from "../src/render/bone_index.js";
import { SEMANTIC } from "../src/domains/body/skeleton.js";
import { createApp } from "../src/app/facade.js";
import glbNodes from "../fixtures/P0/glb_nodes.json" with { type: "json" };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GLB_PATH = join(ROOT, "fixtures/P0/base_female_rigged.glb");

globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });

function glbJsonChunk(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const jsonLen = dv.getUint32(12, true);
  const jsonBytes = buf.subarray(20, 20 + jsonLen);
  return JSON.parse(jsonBytes.toString("utf8").replace(/\0+$/, ""));
}

function trs(node) {
  return {
    name: node.name,
    translation: node.translation || [0, 0, 0],
    rotation: node.rotation || [0, 0, 0, 1],
    scale: node.scale || [1, 1, 1],
  };
}

async function loadGltf() {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const buf = readFileSync(GLB_PATH);
  const loader = new GLTFLoader();
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((resolve, reject) => {
    loader.parse(ab, "", resolve, reject);
  });
}

test("glb_nodes.json names and TRS match the GLB JSON chunk", () => {
  const gltf = glbJsonChunk(readFileSync(GLB_PATH));
  assert.equal(gltf.nodes.length, glbNodes.nodes.length);
  for (let i = 0; i < gltf.nodes.length; i++) {
    const a = trs(gltf.nodes[i]);
    const b = trs(glbNodes.nodes[i]);
    assert.equal(a.name, b.name, `node ${i} name`);
    assert.equal(a.translation.length, b.translation.length);
    for (let k = 0; k < 3; k++) assert.equal(a.translation[k], b.translation[k], `node ${i} t[${k}]`);
    for (let k = 0; k < 4; k++) assert.equal(a.rotation[k], b.rotation[k], `node ${i} r[${k}]`);
    for (let k = 0; k < 3; k++) assert.equal(a.scale[k], b.scale[k], `node ${i} s[${k}]`);
  }
});

test("GLTFLoader sanitizes dotted bone names; 19 SEMANTIC ids miss on obj.name", async () => {
  const gltf = await loadGltf();
  const bySanitized = new Map();
  gltf.scene.traverse((obj) => {
    if (obj.name) bySanitized.set(obj.name, obj);
  });
  const misses = Object.entries(SEMANTIC).filter(([, glb]) => !bySanitized.has(glb));
  assert.equal(misses.length, 19);
});

test("BoneIndex resolves every SEMANTIC bone via userData.name || name", async () => {
  const gltf = await loadGltf();
  const index = new BoneIndex(gltf.scene, SEMANTIC);
  for (const id of Object.keys(SEMANTIC)) {
    const bone = index.get(id);
    assert.ok(bone, id);
    assert.equal(bone.userData.name || bone.name, SEMANTIC[id], id);
  }
  assert.ok(index.size >= Object.keys(SEMANTIC).length);
});

test("PICK_JOINTS is 24 semantic joints and each has FK", () => {
  assert.equal(PICK_JOINTS.length, 24);
  assert.equal(PICK_JOINTS.includes("spine"), false);
  assert.equal(PICK_JOINTS.includes("root"), false);
  const fk = createApp().getEffective().skeleton.fk;
  for (const id of PICK_JOINTS) {
    assert.ok(fk[id], id);
    assert.equal(fk[id].length, 3);
  }
});

test("rendered bone world position matches FK within 5 mm", async () => {
  const THREE = await import("three");
  const gltf = await loadGltf();
  const index = new BoneIndex(gltf.scene, SEMANTIC);
  const app = createApp();
  const skel = app.getEffective().skeleton;
  const root = new THREE.Group();
  const rw = skel.root_world;
  root.position.set(...rw.translation);
  root.quaternion.set(rw.rotation[0], rw.rotation[1], rw.rotation[2], rw.rotation[3]);
  root.scale.set(...(rw.scale || [1, 1, 1]));
  root.add(gltf.scene);
  index.applyLocals(skel.locals);
  root.updateMatrixWorld(true);
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
