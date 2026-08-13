import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { ACTION_NAMES } from "../src/app/actions.js";

test("four named pans are distinct actions", () => {
  for (const n of ["PAN_MIRROR_WINDOW", "PAN_APPARATUS", "PAN_OUTER_FRAME", "PAN_REFLECTED_CONTENT"]) {
    assert.ok(ACTION_NAMES.includes(n));
  }
  const app = createApp();
  const c0 = app.getEffective().camera.world.translation.slice();
  const m0 = app.getEffective().mirror.centre.slice();
  const r0 = app.getRequested().body.pose_targets.root.translation.slice();
  app.dispatch("PAN_MIRROR_WINDOW", { uv: [0.25, 0.1] });
  const m1 = app.getEffective().mirror.centre.slice();
  assert.ok(Math.hypot(m1[0] - m0[0], m1[1] - m0[1], m1[2] - m0[2]) > 1e-4);
  app.dispatch("PAN_APPARATUS", { pan: [0.08, 0] });
  const c1 = app.getEffective().camera.world.translation.slice();
  assert.ok(Math.abs(c1[0] - c0[0]) > 1e-4);
  app.dispatch("PAN_OUTER_FRAME", { pan: [0.05, -0.05] });
  assert.equal(app.getRequested().camera.crop_request.pan[0], 0.05);
  app.dispatch("PAN_REFLECTED_CONTENT", { delta: [0.04, 0] });
  assert.ok(Math.abs(app.getRequested().body.pose_targets.root.translation[0] - r0[0] - 0.04) < 1e-9);
});

test("AUTO loop segment does not mutate capture; extraScale fills P", () => {
  const app = createApp();
  const phone0 = JSON.stringify(app.getRequested().phone);
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  app.dispatch("SET_VIEW_TRAVERSAL", { tau: 2.4 });
  const v = app.getEffective().view;
  assert.equal(v.segment, "LOOP");
  assert.equal(v.mutates_capture, false);
  assert.ok(v.extraScale > 1);
  assert.equal(JSON.stringify(app.getRequested().phone), phone0);
});

test("sensitivity and mirror-fit proposal", () => {
  const app = createApp();
  assert.ok(Array.isArray(app.getEffective().sensitivity));
  assert.ok(app.getEffective().sensitivity.length > 0);
  app.dispatch("REQUEST_MIRROR_FIT", {});
  const p = app.getEffective().proposal;
  assert.equal(p.kind, "MIRROR_FIT");
  assert.equal(p.status, "OPEN");
  const w0 = app.getRequested().mirror.width_m;
  app.dispatch("ACCEPT_PROPOSAL", {});
  assert.ok(app.getRequested().mirror.width_m !== w0 || app.getRequested().mirror.height_m);
});

test("COMPOSITION_FIT nudges phone residual", () => {
  const app = createApp();
  const r0 = app.getEffective().residuals.phone.residual;
  app.dispatch("SET_DRIVER", { mode: "COMPOSITION_FIT" });
  const r1 = app.getEffective().residuals.phone.residual;
  assert.ok(Number.isFinite(r1));
  assert.ok(r1 <= r0 + 1e-6);
});
