import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createApp } from "../src/app/facade.js";
import { finiteApertureTest } from "../src/domains/reflection/reflect.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

test("ACC-REF-02 · clip volume agrees with finiteApertureTest on interior mirror samples", async () => {
  const THREE = await import("three");
  const { MirrorReflector } = await import("../src/render/mirror_reflector.js");
  const app = createApp();
  const eff = app.getEffective();
  const scene = new THREE.Scene();
  const refl = new MirrorReflector(THREE, scene);
  refl.updateClip(eff);
  assert.ok(refl.clipPlanes.length >= 5, "expected aperture pyramid plus mirror plane");
  const mirror = eff.mirror;
  const camC = eff.camera.world.translation;
  const centre = mirror.centre;
  const u = mirror.basis.u;
  const v = mirror.basis.v;
  const samples = [
    centre,
    [
      centre[0] + 0.15 * mirror.width_m * u[0] + 0.15 * mirror.height_m * v[0],
      centre[1] + 0.15 * mirror.width_m * u[1] + 0.15 * mirror.height_m * v[1],
      centre[2] + 0.15 * mirror.width_m * u[2] + 0.15 * mirror.height_m * v[2],
    ],
    [
      centre[0] - 0.15 * mirror.width_m * u[0] - 0.1 * mirror.height_m * v[0],
      centre[1] - 0.15 * mirror.width_m * u[1] - 0.1 * mirror.height_m * v[1],
      centre[2] - 0.15 * mirror.width_m * u[2] - 0.1 * mirror.height_m * v[2],
    ],
  ];
  for (const p of samples) {
    const vis = finiteApertureTest(p, camC, mirror);
    assert.equal(vis.visible, refl.insideClip(p), `sample ${p.map((x) => x.toFixed(3)).join(",")}`);
  }
  const n = mirror.basis.n;
  const behind = [centre[0] - n[0] * 0.2, centre[1] - n[1] * 0.2, centre[2] - n[2] * 0.2];
  assert.equal(refl.insideClip(behind), false, "point behind mirror must be clipped");
});

test("ACC-REF-02b · default scene keeps mirror behind the subject head", () => {
  const eff = createApp().getEffective();
  const head = eff.skeleton.fk.head;
  const n = eff.mirror.basis.n;
  const c = eff.mirror.centre;
  const signed = n[0] * (head[0] - c[0]) + n[1] * (head[1] - c[1]) + n[2] * (head[2] - c[2]);
  assert.ok(signed > 0.05, `head should be on the camera side of the mirror, got ${signed}`);
  assert.ok(eff.apparatus.d_M > 1.0, `expected authored mirror distance, got ${eff.apparatus.d_M}`);
});

test("ACC-REF-01 · reflected skinned meshes use detached bind", () => {
  const src = readFileSync(resolve(root, "src/render/mirror_reflector.js"), "utf8");
  assert.match(src, /bindMode\s*=\s*["']detached["']/);
  assert.match(src, /clippingPlanes/);
});
