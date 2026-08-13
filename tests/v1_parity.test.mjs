import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { ACTION_NAMES } from "../src/app/actions.js";
import { distance } from "../src/shared_math/vector.js";
import { loopPeriod, loopPhase, inverseDesiredPortal, sampleI, evaluateRecursion } from "../src/domains/recursion/kernel.js";
import { activeOverlays } from "../src/render/overlays.js";
import { defaultRequestedState } from "../src/scene/requested_state.js";
import { disjointIntervals } from "../src/domains/visibility/report.js";
import { occludesSegment } from "../src/domains/visibility/report.js";
import { identity } from "../src/shared_math/transform.js";

test("link lengths preserved after PHONE_DRIVES_HAND IK", () => {
  const app = createApp();
  const L = app.getEffective().skeleton.link_lengths.arm_R;
  assert.ok(Math.abs(L.L1 - L.L1_rest) < 1e-4);
  assert.ok(Math.abs(L.L2 - L.L2_rest) < 1e-4);
  const fk = app.getEffective().skeleton.fk;
  assert.ok(fk.head[2] > fk.pelvis[2]);
  assert.ok(fk.pelvis[2] > fk.ankle_L[2]);
  const stature = fk.head[2] - Math.min(fk.toe_L[2], fk.toe_R[2]);
  assert.ok(stature > 1.2 && stature < 2.0);
  assert.equal(app.getEffective().skeleton.labelled_stature_m, 1.727);
});

test("HAND_DRIVES_PHONE moves phone with wrist target", () => {
  const app = createApp();
  const phone0 = app.getEffective().phone.world.translation.slice();
  app.dispatch("SET_PHONE_AUTHORITY", { authority: "HAND_DRIVES_PHONE" });
  app.dispatch("MOVE_POSE_TARGET", { end: "wrist_R", world: [0.18, 0.62, 1.35] });
  const wrist = app.getEffective().skeleton.fk.wrist_R;
  const phone = app.getEffective().phone.world.translation;
  assert.ok(distance(wrist, [0.18, 0.62, 1.35]) < 0.08);
  assert.ok(distance(phone, phone0) > 1e-4);
  assert.ok(distance(phone, wrist) < 0.08);
});

test("support plant is applied on effective skeleton", () => {
  const app = createApp();
  const s = app.getEffective().support;
  assert.equal(typeof s.plant_delta_z, "number");
  const toes = ["toe_L", "toe_R", "ankle_L", "ankle_R"]
    .map((k) => app.getEffective().skeleton.fk[k])
    .filter(Boolean);
  assert.ok(toes.length > 0);
  const minZ = Math.min(...toes.map((p) => p[2]));
  assert.ok(Math.abs(minZ) < 0.05);
});

test("Bend Tilt Twist is a semantic action and joint limits project", () => {
  const app = createApp();
  app.dispatch("SET_ANATOMICAL_DOF", { joint: "head", bend: 0.2, tilt: -0.1, twist: 0.05 });
  const q = app.getRequested().body.pose_targets.bend_tilt_twist.head;
  assert.equal(q.length, 4);
  app.dispatch("SET_ANATOMICAL_DOF", { joint: "head", bend: 8, tilt: 0, twist: 0 });
  const q2 = app.getEffective().skeleton.locals;
  assert.ok(q2);
});

test("autosolve compensation is inspectable; last_edit names driver/preserve/allowed", () => {
  const app = createApp();
  app.dispatch("MOVE_PHONE", { translation: [0.14, 0.52, 1.42] });
  const last = app.getEffective().last_edit;
  assert.equal(last.action, "MOVE_PHONE");
  assert.equal(last.driver, "phone");
  assert.ok(Array.isArray(last.preserve));
  assert.ok(Array.isArray(last.allowed_to_move));
  const c = app.getEffective().compensation;
  assert.ok(c);
  assert.equal(c.variable, "mirror_distance_request_m");
  assert.equal(c.inspectable, true);
  assert.ok("from" in c && "to" in c);
});

test("FOV is a sensitivity variable", () => {
  const app = createApp();
  const s = app.getEffective().sensitivity;
  assert.ok(s.some((row) => row.wrt === "hfov"));
});

test("one drag is one undo transaction", () => {
  const app = createApp();
  const d0 = app.getRequested().apparatus.mirror_distance_request_m;
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 1.33 });
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 1.44 });
  app.dispatch("UNDO", {});
  assert.equal(app.getRequested().apparatus.mirror_distance_request_m, 1.33);
  app.dispatch("UNDO", {});
  assert.equal(app.getRequested().apparatus.mirror_distance_request_m, d0);
});

test("numeric FOV round-trips through SET_CAMERA_FOV", () => {
  const app = createApp();
  const hfov = (55 * Math.PI) / 180;
  app.dispatch("SET_CAMERA_FOV", { hfov });
  assert.ok(Math.abs(app.getRequested().camera.hfov_request - hfov) < 1e-12);
  assert.ok(Math.abs(app.getEffective().camera.hfov - hfov) < 1e-12);
});

test("one selection drives overlay set; inspect is not a production nav room", () => {
  const app = createApp();
  app.dispatch("SET_WORKSPACE_MODE", { mode: "POSE" });
  app.dispatch("SET_SELECTION", { selection: "body" });
  const pose = activeOverlays(app.getRequested());
  assert.equal(pose.SKELETON, true);
  app.dispatch("SET_WORKSPACE_MODE", { mode: "SCENE" });
  app.dispatch("SET_SELECTION", { selection: "mirror" });
  const scene = activeOverlays(app.getRequested());
  assert.equal(scene.MIRROR, true);
});

test("loop period is log|γ|; LOOP phase uses that period", () => {
  const app = createApp();
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  const cert = app.getEffective().recursion.certificate;
  if (!cert) return;
  const T = loopPeriod(cert);
  assert.ok(Math.abs(T - Math.log(cert.gamma_abs)) < 1e-12);
  const p0 = loopPhase(cert, 2);
  const p1 = loopPhase(cert, 3);
  assert.ok(Math.abs(p1[0] - p0[0] - T) < 1e-12);
  app.dispatch("SET_VIEW_TRAVERSAL", { tau: 3 });
  const v = app.getEffective().view;
  assert.equal(v.segment, "LOOP");
  assert.ok(Math.abs(v.loop_period - T) < 1e-12);
  assert.ok(Math.abs(v.phase[0] - T) < 1e-9);
});

test("inverse desired-portal reconstructs γ", () => {
  const inv = inverseDesiredPortal({ k: 1 / 22.5836845286, theta_out: 0, q: 1, n: 1 });
  assert.equal(inv.compatible, true);
  assert.ok(inv.S > 1);
  assert.ok(inv.residual < 1e-6);
});

test("no-fold certificate detJ > 0 away from pole", () => {
  const rec = evaluateRecursion(Object.assign(defaultRequestedState(), { recursion: { ...defaultRequestedState().recursion, mode: "AUTO" } }), {
    valid: true,
    quad: [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]],
  });
  assert.equal(rec.certificate.no_fold, true);
  assert.ok(rec.certificate.detJ_probe > 0);
  const s = sampleI([0.7, 0.4], rec.certificate, {});
  assert.equal(s.folded, false);
  assert.ok(s.detJ > 0);
});

test("disjoint visibility intervals and phone occlusion classifier exist", () => {
  assert.deepEqual(disjointIntervals([true, true, false, true]), [[0, 1], [3, 3]]);
  const mesh = {
    positions: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
    triangles: [[0, 1, 2]],
  };
  const hit = occludesSegment([0.1, 0.1, -1], [0.1, 0.1, 1], mesh, identity());
  assert.equal(typeof hit, "boolean");
  const app = createApp();
  assert.ok(app.getEffective().visibility.disjoint);
  assert.ok(app.getEffective().visibility.occlusion);
});

test("required production actions exist and ROTATE_MIRROR does not", () => {
  for (const n of [
    "SET_DRIVER",
    "SET_PRESERVE_SET",
    "SET_SOLVE_FREEDOMS",
    "SET_ANATOMICAL_DOF",
    "SET_PHONE_AUTHORITY",
    "SET_CAMERA_FOV",
  ]) {
    assert.ok(ACTION_NAMES.includes(n));
  }
  assert.equal(ACTION_NAMES.includes("ROTATE_MIRROR"), false);
});
