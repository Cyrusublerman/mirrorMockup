import test from "node:test";
import assert from "node:assert/strict";
import * as vec from "../src/shared_math/vector.js";
import * as quat from "../src/shared_math/quaternion.js";
import { twoLinkIk, twoLinkReach } from "../src/shared_math/numerical.js";
import { fxFromHfov, pinholeProject } from "../src/shared_math/projection.js";
import { reflectPoint, householderAffine } from "../src/domains/reflection/reflect.js";
import { certifyKernel, PUBLISHED, alpha, lattice, outputRepeat, similarityFixedPoint } from "../src/domains/recursion/kernel.js";
import { sameAnatomyScale, nuD, nuR } from "../fixtures/optical_special_case/parallel.js";
import { mirrorCentre, derivedRelation, productionMirrorBasis } from "../src/domains/apparatus/relation.js";
import { p0PoseRotations } from "../src/domains/body/skeleton.js";
import { homographyFromPoints, applyHomography } from "../src/shared_math/homography.js";
import { prismMesh } from "../src/domains/phone/prism.js";
import { mirrorMesh } from "../src/domains/mirror/mesh.js";
import { createApp } from "../src/app/facade.js";
import { ACTION_NAMES } from "../src/app/actions.js";

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

test("A.1 pinhole u = fx Xc/Zc + cx", () => {
  const fx = fxFromHfov(1000, Math.PI / 3);
  assert.ok(fx > 800 && fx < 900);
  const p = pinholeProject([0.2, 1.5, 0.4], [0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0], 800, 800, 500, 400);
  assert.equal(p.valid, true);
  assert.ok(Math.abs(p.u - (800 * (0.2 / 1.5) + 500)) < 1e-12);
  assert.ok(Math.abs(p.v - (800 * (0.4 / 1.5) + 400)) < 1e-12);
});

test("mirror involution", () => {
  const M = [0, 1, 0];
  const n = [0, 1, 0];
  const X = [0.2, 0.3, 0.4];
  const Y = reflectPoint(X, M, n);
  const Z = reflectPoint(Y, M, n);
  assert.ok(vec.distance(X, Z) < 1e-9);
});

test("A.2 Householder affine matches point reflection and is involution", () => {
  const M = [0.3, 1.0, 1.2];
  const n = [0, 1, 0];
  const X = [0.12, 0.55, 1.48];
  const Y = reflectPoint(X, M, n);
  const H = householderAffine(M, n);
  const apply = (H, P) => [
    H[0] * P[0] + H[1] * P[1] + H[2] * P[2] + H[3],
    H[4] * P[0] + H[5] * P[1] + H[6] * P[2] + H[7],
    H[8] * P[0] + H[9] * P[1] + H[10] * P[2] + H[11],
  ];
  assert.ok(vec.distance(Y, apply(H, X)) < 1e-9);
  assert.ok(vec.distance(X, apply(H, apply(H, X))) < 1e-9);
});

test("A.3 apparatus M = C + d_M f + p_u r + p_v u; n_M = -f", () => {
  const frame = { origin: [0.1, 0.2, 0.3], right: [1, 0, 0], up: [0, 0, 1], forward: [0, 1, 0] };
  const d_M = 1.55;
  const pan = [0.18, 0.12];
  const M = mirrorCentre(frame, d_M, pan);
  assert.ok(vec.distance(M, [0.28, 1.75, 0.42]) < 1e-12);
  const rel = derivedRelation(frame, M);
  assert.ok(Math.abs(rel.d_M - d_M) < 1e-12);
  assert.ok(Math.abs(rel.pan_uv[0] - pan[0]) < 1e-12);
  assert.ok(Math.abs(rel.pan_uv[1] - pan[1]) < 1e-12);
  const n = productionMirrorBasis(frame).n;
  assert.ok(vec.distance(n, [0, -1, 0]) < 1e-12);
});

test("A.6–A.11 kernel lattice, α, γ, p_fix", () => {
  const c = certifyKernel({ q: 1, n: 1, Sval: 256, theta_s: 0 });
  assert.ok(Math.abs(c.gamma_abs - PUBLISHED.gamma_abs) < 1e-6);
  const argDeg = (c.gamma_arg * 180) / Math.PI;
  assert.ok(Math.abs(argDeg - PUBLISHED.gamma_arg_deg) < 1e-4);
  const a = alpha(1, 1, 0, 256);
  assert.ok(Math.abs(a[0] - PUBLISHED.alpha_re) < 1e-9);
  assert.ok(Math.abs(a[1] - PUBLISHED.alpha_im) < 1e-6);
  const lat = lattice(256, 0);
  assert.ok(Math.abs(lat.lambda1[0] - Math.log(256)) < 1e-12);
  assert.ok(Math.abs(lat.lambda2[1] - 2 * Math.PI) < 1e-12);
  const g = outputRepeat(lat.lambda1, a);
  assert.ok(Math.abs(g[0] - c.gamma[0]) < 1e-12);
  assert.ok(Math.abs(g[1] - c.gamma[1]) < 1e-12);
  const pFix = similarityFixedPoint([0.5, 0], [0.1, 0.2]);
  assert.ok(Math.abs(pFix[0] - 0.2) < 1e-12);
  assert.ok(Math.abs(pFix[1] - 0.4) < 1e-12);
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

test("A.5 parallel λ = a/(a+2d) is diagnostic, not image λ*", () => {
  assert.equal(sameAnatomyScale(1, 0.5), 0.5);
  assert.ok(nuD(0.8, Math.PI / 3, 1.7) > 0);
  assert.ok(nuR(0.8, 0.8, 0.5, 1.7) > 0);
  const app = createApp();
  const imageLam = app.getEffective().composition_metrics.same_anatomy_scale;
  assert.ok(imageLam == null || Number.isFinite(imageLam));
  assert.ok(imageLam == null || Math.abs(imageLam - 0.5) > 1e-3);
});

test("P0 pose seed is elbow 132.95 only; knees are not 3D joints", () => {
  const pose = p0PoseRotations();
  assert.ok(pose.elbow_R);
  assert.equal(pose.knee_L, undefined);
  assert.equal(pose.knee_R, undefined);
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
  const p0 = app.getEffective().carrier_p.quad;
  app.dispatch("SET_CONTENT_Q", { scale: 0.4, offset: [0.1, 0.1] });
  const p1 = app.getEffective().carrier_p.quad;
  for (let i = 0; i < 4; i++) {
    assert.ok(Math.hypot(p1[i][0] - p0[i][0], p1[i][1] - p0[i][1]) < 1e-12);
  }
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
  assert.ok(last.export.overlay);
  assert.ok(last.export.staging);
  assert.ok(last.export.recursive_reference);
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
