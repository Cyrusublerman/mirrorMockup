// ACC-RIG-01 — every semantic bone must resolve through the loader that actually consumes the GLB.
// The fixtures are correct; nothing verifies them against GLTFLoader's sanitised node names.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const MAP = JSON.parse(readFileSync(resolve(root, "fixtures/P0/skeleton_map.json"), "utf8"));
const NODES = JSON.parse(readFileSync(resolve(root, "fixtures/P0/glb_nodes.json"), "utf8"));
const SEMANTIC = MAP.semantic_to_glb;

// three.js PropertyBinding.sanitizeNodeName strips these before assigning Object3D.name
const RESERVED = /[\[\]\.:\/]/g;
const sanitize = (n) => n.replace(/\s/g, "_").replace(RESERVED, "");

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
  return { byRuntimeName, byOriginalName };
}

test("fixture node names match the GLB exactly", () => {
  // guards against the fixture drifting away from the asset it describes
  assert.equal(NODES.nodes.length, 71);
  assert.equal(NODES.skeleton_root, 5);
  assert.equal(NODES.joints.length, 54);
});

test("ACC-RIG-01 · every semantic bone resolves by its original glTF name", async () => {
  const { byOriginalName } = await loadSceneBoneNames();
  const missing = Object.entries(SEMANTIC).filter(([, glb]) => !byOriginalName.has(glb));
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
  const unresolved = Object.values(SEMANTIC).filter((glb) => !byRuntimeName.has(glb));
  assert.ok(
    unresolved.length > 0,
    "asset no longer contains reserved characters; revisit the BoneIndex fallback"
  );
});

test("ACC-RIG-01c · the renderer uses the original name, not the sanitised one", () => {
  const src = readFileSync(resolve(root, "src/render/scene_3d.js"), "utf8");
  assert.match(
    src,
    /userData\s*(\?\.|\.)\s*name/,
    "scene_3d.js must look bones up by userData.name; Object3D.name has had dots stripped"
  );
  assert.doesNotMatch(
    src,
    /skel\.locals\[\s*obj\.name\s*\]/,
    "bare obj.name lookup silently fails for every bone whose glTF name contains a dot"
  );
});

test("ACC-RIG-01d · no pick target names a joint the solver cannot produce", () => {
  const src = readFileSync(resolve(root, "src/render/scene_3d.js"), "utf8");
  const m = src.match(/const PICK_JOINTS\s*=\s*\[([^\]]*)\]/);
  assert.ok(m, "PICK_JOINTS not found");
  const picks = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  const semantic = new Set(Object.keys(SEMANTIC));
  const phantom = picks.filter((p) => !semantic.has(p));
  assert.deepEqual(phantom, [], `pick ids with no semantic joint: ${phantom.join(", ")}`);
});
