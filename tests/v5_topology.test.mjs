import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";

test("v5 §2 · CAMERA_BETWEEN declares an independent external camera entity", () => {
  const app = createApp();
  const front = app.getEffective().camera.world.translation.slice();
  app.dispatch("SET_TOPOLOGY", { topology: "CAMERA_BETWEEN" });
  const req = app.getRequested();
  const ext0 = app.getEffective().camera.world.translation.slice();
  assert.equal(req.camera.topology_epistemic, "DECLARED");
  assert.equal(req.camera.external_transform_epistemic, "HYPOTHESIS");
  assert.equal(app.getEffective().camera.mount, "EXTERNAL");
  assert.equal(app.getEffective().camera.same_side_as_screen, false);
  assert.ok(Math.hypot(ext0[0]-front[0], ext0[1]-front[1], ext0[2]-front[2]) < 1e-9);

  const p = req.phone.transform_request.translation.slice();
  app.dispatch("MOVE_PHONE", { translation: [p[0] + 0.04, p[1], p[2]] });
  const ext1 = app.getEffective().camera.world.translation;
  assert.ok(Math.hypot(ext1[0]-ext0[0], ext1[1]-ext0[1], ext1[2]-ext0[2]) < 1e-9);
  assert.notDeepEqual(app.getEffective().phone.world.translation, p);
});

test("v5 §2 · returning to FRONT_CAMERA_SELFIE reattaches the optical centre to the phone", () => {
  const app = createApp();
  app.dispatch("SET_TOPOLOGY", { topology: "CAMERA_BETWEEN" });
  app.dispatch("SET_TOPOLOGY", { topology: "FRONT_CAMERA_SELFIE" });
  const c0 = app.getEffective().camera.world.translation.slice();
  const p = app.getRequested().phone.transform_request.translation.slice();
  app.dispatch("MOVE_PHONE", { translation: [p[0] + 0.03, p[1], p[2]] });
  const c1 = app.getEffective().camera.world.translation;
  assert.ok(Math.abs((c1[0] - c0[0]) - 0.03) < 1e-6);
  assert.equal(app.getEffective().camera.mount, "FRONT");
  assert.equal(app.getEffective().camera.same_side_as_screen, true);
});
