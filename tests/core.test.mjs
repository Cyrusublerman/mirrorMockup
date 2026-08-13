import test from "node:test";
import assert from "node:assert/strict";
import * as vec from "../src/shared_math/vector.js";
import * as quat from "../src/shared_math/quaternion.js";
import { twoLinkIk, twoLinkReach } from "../src/shared_math/numerical.js";
import { fxFromHfov } from "../src/shared_math/projection.js";
import { reflectPoint } from "../src/domains/reflection/reflect.js";
import { certifyKernel, PUBLISHED, alpha, lattice, gammaFromAlpha } from "../src/domains/recursion/kernel.js";
import { sameAnatomyScale, nuD, nuR } from "../fixtures/optical_special_case/parallel.js";
import { homographyFromPoints, applyHomography } from "../src/shared_math/homography.js";
import { prismMesh } from "../src/domains/phone/prism.js";
import { mirrorMesh } from "../src/domains/mirror/mesh.js";
import { createApp } from "../src/app/facade.js";
import { ACTION_NAMES } from "../src/app/actions.js";
import { defaultRequestedState } from "../src/scene/requested_state.js";

test("vector orthonormal", () => {
  const f = vec.orthonormalFrame([0, 1, 0], [0, 0, 1]);
  assert.ok(Math.abs(vec.dot(f.forward, f.up)) < 1e-9);
  assert.ok(Math.abs(vec.dot(f.right, f.up)) < 1e-9);
});

test("quat rotate roundtrip", () => {
  const q = quat.fromAxisAngle([0, 0, 1], Math.PI / 2);
  const v = quat.rotateVec(q, [1, 0, 0]);
  assert.ok(Math.abs(v[1] - 1) < 1e-9);
});

test("two-link reach", () => {
  const r = twoLinkReach(0.3, 0.25, 0.4);
  assert.equal(r.reachable, true);
  const ik = twoLinkIk([0, 0, 0], [0.4, 0, 0], 0.3, 0.25, [0, 0, 1], 1);
  assert.ok(ik.residual < 1e-6);
});

test("pinhole fx", () => {
  const fx = fxFromHfov(1000, Math.PI / 3);
  assert.ok(fx > 800 && fx < 900);
});

test("mirror involution", () => {
  const M = [0, 1, 0];
  const n = [0, 1, 0];
  const X = [0.2, 0.3, 0.4];
  const Y = reflectPoint(X, M, n);
  const Z = reflectPoint(Y, M, n);
  assert.ok(vec.distance(X, Z) < 1e-9);
});

test("kernel published gamma", () => {
  const c = certifyKernel({ q: 1, n: 1, Sval: 256, theta_s: 0 });
  assert.ok(Math.abs(c.gamma_abs - PUBLISHED.gamma_abs) < 1e-6);
  const argDeg = (c.gamma_arg * 180) / Math.PI;
  assert.ok(Math.abs(argDeg - PUBLISHED.gamma_arg_deg) < 1e-4);
  const a = alpha(1, 1, 0, 256);
  assert.ok(Math.abs(a[0] - PUBLISHED.alpha_re) < 1e-9);
  assert.ok(Math.abs(a[1] - PUBLISHED.alpha_im) < 1e-6);
});

test("homography roundtrip", () => {
  const src = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const dst = [[0.1, 0.2], [0.8, 0.1], [0.9, 0.9], [0.05, 0.85]];
  const H = homographyFromPoints(src, dst);
  for (let i = 0; i < 4; i++) {
    const p = applyHomography(H, src[i]);
    assert.ok(Math.hypot(p[0] - dst[i][0], p[1] - dst[i][1]) < 1e-8);
  }
});

test("phone is rectangular prism", () => {
  const m = prismMesh({ width: 0.07, height: 0.14, depth: 0.008 });
  assert.equal(m.kind, "rectangular_prism");
  assert.equal(m.positions.length, 8);
  assert.equal(m.triangles.length, 12);
});

test("mirror is simple aperture mesh", () => {
  const m = mirrorMesh([0, 1, 1], { u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] }, 0.6, 0.8, 0.01);
  assert.equal(m.kind, "aperture_slab");
  assert.equal(m.quad.length, 4);
  assert.equal(m.positions.length, 8);
  assert.equal(m.triangles.length, 12);
});

test("parallel special case diagnostic", () => {
  assert.equal(sameAnatomyScale(1, 0.5), 0.5);
  assert.ok(nuD(0.8, Math.PI / 3, 1.7) > 0);
  assert.ok(nuR(0.8, 0.8, 0.5, 1.7) > 0);
});

test("app solve and warp toggle", () => {
  const app = createApp();
  const a = app.getEffective();
  assert.ok(a.phone.mesh.kind === "rectangular_prism");
  assert.equal(a.phone.mesh.triangles.length, 12);
  assert.equal(a.phone.screen_mesh.kind, "screen_quad");
  assert.ok(a.mirror.mesh.kind === "aperture_slab");
  assert.equal(a.mirror.mesh.positions.length, 8);
  assert.equal(a.view.mutates_capture, false);
  const before = structuredClone(app.getRequested().phone);
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  assert.deepEqual(app.getRequested().phone, before);
  const rec = app.getEffective().recursion;
  assert.ok(rec.mode === "AUTO" || rec.refused === true);
});

test("Q does not move P", () => {
  const app = createApp();
  const p0 = JSON.stringify(app.getEffective().carrier_p.quad);
  app.dispatch("SET_CONTENT_Q", { scale: 0.4, offset: [0.1, 0.1] });
  assert.equal(JSON.stringify(app.getEffective().carrier_p.quad), p0);
});

test("dolly does not write capture camera", () => {
  const app = createApp();
  const cam0 = JSON.stringify(app.getRequested().phone.transform_request);
  app.dispatch("SET_VIEW_TRAVERSAL", { tau: 0.7 });
  assert.equal(JSON.stringify(app.getRequested().phone.transform_request), cam0);
  assert.equal(app.getEffective().view.segment, "DOLLY");
  app.dispatch("SET_VIEW_TRAVERSAL", { tau: 2.2 });
  assert.ok(["LOOP", "CLAMP", "APPROACH"].includes(app.getEffective().view.segment));
});

test("no ROTATE_MIRROR", () => {
  assert.equal(ACTION_NAMES.includes("ROTATE_MIRROR"), false);
  const app = createApp();
  const r = app.dispatch("ROTATE" + "_MIRROR", {});
  assert.ok(r.error);
});

test("export png", () => {
  const app = createApp();
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  const last = app.dispatch("EXPORT_IMAGE", { width: 32, height: 32 });
  assert.equal(last.export.png[0], 137);
  assert.equal(last.export.png[1], 80);
  assert.ok(last.export.sidecar);
  assert.ok(last.export.unwarped);
});

test("save restore", () => {
  const app = createApp();
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 1.11 });
  const pack = app.pack();
  const app2 = createApp();
  app2.load(pack);
  assert.equal(app2.getRequested().apparatus.mirror_distance_request_m, 1.11);
});

test("phone rotation rotates camera and mirror relation", () => {
  const app = createApp();
  const n0 = app.getEffective().mirror.basis.n.slice();
  app.dispatch("ROTATE_PHONE", { yaw: 0.35, pitch: 0, roll: 0, translation: app.getRequested().phone.transform_request.translation });
  const n1 = app.getEffective().mirror.basis.n;
  const f = app.getEffective().camera.basis.forward;
  const align = n1[0] * f[0] + n1[1] * f[1] + n1[2] * f[2];
  assert.ok(Math.abs(align + 1) < 1e-6);
  assert.ok(vec.distance(n0, n1) > 1e-6);
});
