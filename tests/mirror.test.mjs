import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { MirrorReflector } from "../src/render/mirror_reflector.js";
import { finiteApertureTest } from "../src/domains/reflection/reflect.js";
import { t } from "../fixtures/tolerances.js";

globalThis.self = globalThis;

test("clip planes agree with finiteApertureTest; behind-mirror is out", async () => {
  const THREE = await import("three");
  const app = createApp();
  const eff = app.getEffective();
  const scene = new THREE.Scene();
  const refl = new MirrorReflector(THREE, scene);
  refl.updateClip(eff);
  const C = eff.camera.world.translation;
  const M = eff.mirror.centre;
  const n = eff.mirror.basis.n;
  const dir = [M[0] - C[0], M[1] - C[1], M[2] - C[2]];
  const behind = [M[0] + dir[0] * 0.4, M[1] + dir[1] * 0.4, M[2] + dir[2] * 0.4];
  const front = [M[0] - n[0] * 0.05, M[1] - n[1] * 0.05, M[2] - n[2] * 0.05];
  const outside = [
    M[0] + eff.mirror.basis.u[0] * (eff.mirror.width_m * 2),
    M[1] + eff.mirror.basis.u[1] * (eff.mirror.width_m * 2),
    M[2] + eff.mirror.basis.u[2] * (eff.mirror.width_m * 2),
  ];
  const apIn = finiteApertureTest(behind, C, eff.mirror);
  assert.equal(apIn.visible, true);
  assert.equal(refl.insideClip(behind), true);
  const apOut = finiteApertureTest(outside, C, eff.mirror);
  assert.equal(apOut.visible, false);
  assert.equal(refl.insideClip(outside), false);
  const camSide = [M[0] + n[0] * 0.2, M[1] + n[1] * 0.2, M[2] + n[2] * 0.2];
  assert.equal(refl.insideClip(camSide), false);
  assert.ok(front);
  assert.ok(t("T-CLIP") > 0);
});
