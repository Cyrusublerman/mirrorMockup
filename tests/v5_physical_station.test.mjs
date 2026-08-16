import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { distance } from "../src/shared_math/vector.js";

test("ACC-STATION-01 · default hypothesis reproduces the v5 analysis station", () => {
  const app = createApp();
  const e = app.getEffective();
  const f = e.feasible;
  assert.ok(e.skeleton.fk.face_reference, "post-IK face surface reference must exist");
  assert.ok(Math.abs(e.skeleton.model_stature_m - 1.700) < 1e-9);
  assert.ok(Math.abs(e.skeleton.labelled_stature_m - 1.700) < 1e-9);
  assert.ok(Math.abs(e.camera.world.translation[2] - 1.665) < 1e-9);
  assert.ok(Math.abs(f.m - 1.200) < 0.002, `m=${f.m}`);
  assert.ok(Math.abs(f.u - 0.340) < 0.002, `u=${f.u}`);
  assert.ok(Math.abs(f.c - 1.540) < 0.002, `c=${f.c}`);
  assert.ok(Math.abs(f.e - 0.140) < 0.002, `e=${f.e}`);
  assert.ok(Math.abs(f.a - 0.368) < 0.002, `a=${f.a}`);
  assert.ok(Math.abs(f.R - 7.46) < 0.03, `R=${f.R}`);
  assert.ok(Math.abs(f.sigma * 180 / Math.PI - 19.45) < 0.15, `sigma=${f.sigma * 180 / Math.PI}`);
  assert.equal(app.getRequested().apparatus.operating_point_epistemic, "UNRESOLVED");
  assert.equal(app.getRequested().apparatus.working_station.status, "HYPOTHESIS");
});

test("ACC-APERTURE-01 · v5 station gives the declared vertical mirror band", () => {
  const b = createApp().getEffective().aperture_band;
  assert.ok(Math.abs(b.required_sill - 0.729) < 0.002, `sill=${b.required_sill}`);
  assert.ok(Math.abs(b.required_height - 0.955) < 0.002, `height=${b.required_height}`);
  assert.ok(Math.abs(b.actual_sill - 0.850) < 1e-9, `actual_sill=${b.actual_sill}`);
  assert.ok(Math.abs(b.actual_height - 1.100) < 1e-9, `actual_height=${b.actual_height}`);
  assert.ok(Math.abs(b.visible_band[0] - 0.215) < 0.002, `band0=${b.visible_band[0]}`);
  assert.ok(Math.abs(b.visible_band[1] - 1.700) < 1e-9, `band1=${b.visible_band[1]}`);
});

test("ACC-CHAIN-01 · 0.22 m is wrist-to-optical-centre, not phone-to-camera", () => {
  const app = createApp();
  const e = app.getEffective();
  const C = e.camera.world.translation;
  const G = e.grip.wrist_target;
  const P = e.phone.world.translation;
  assert.ok(Math.abs(distance(C, G) - 0.220) < 0.002, `C→grip=${distance(C,G)}`);
  assert.ok(distance(C, P) < 0.08, `phone→camera incorrectly collapsed lever: ${distance(C,P)}`);
});

test("ACC-POSE-AUTH-01 · phone reach failure never silently moves the root", () => {
  const app = createApp();
  const before = app.getRequested().body.pose_targets.root.translation.slice();
  app.dispatch("MOVE_PHONE", { translation: [1.4, -0.2, 2.2] });
  const after = app.getRequested().body.pose_targets.root.translation;
  assert.ok(Math.abs(after[0] - before[0]) < 1e-12);
  assert.ok(Math.abs(after[1] - before[1]) < 1e-12);
  const e = app.getEffective();
  assert.ok(distance(e.phone.world.translation, app.getRequested().phone.transform_request.translation) > 0.25,
    "hard feasibility must project the effective phone instead of moving the root");
  assert.equal(e.feasible.inside, true);
});

test("ACC-GRIP-01 · HAND_DRIVES_PHONE preserves the explicit grip transform", () => {
  const app = createApp();
  app.dispatch("SET_PHONE_AUTHORITY", { authority: "HAND_DRIVES_PHONE" });
  app.dispatch("MOVE_POSE_TARGET", { end: "wrist_R", world: [0.18, 0.52, 1.35] });
  const e = app.getEffective();
  assert.ok(distance(e.skeleton.fk.wrist_R, [0.18, 0.52, 1.35]) < 0.08);
  assert.ok(distance(e.phone.grip_world.translation, e.skeleton.fk.wrist_R) < 1e-6,
    `grip/wrist drift=${distance(e.phone.grip_world.translation,e.skeleton.fk.wrist_R)}`);
});

test("ACC-MIRROR-MATH-01 · working mirror actually contains reflected body samples", () => {
  const e = createApp().getEffective();
  const ids = ["pelvis", "spine_mid", "ribcage", "head", "knee_L", "knee_R"];
  const visible = ids.filter((id) => e.visibility.reports?.[id]?.reflected?.visible);
  assert.ok(visible.length >= 4, `visible reflected semantic samples: ${visible.join(",")}`);
  assert.ok(e.visibility.reports.pelvis.reflected.aperture.visible);
});
