import test from "node:test";
import assert from "node:assert/strict";
import { p0Targets } from "../src/domains/composition/targets.js";
import { projectWorld } from "../src/domains/visibility/report.js";
import { createApp } from "../src/app/facade.js";

test("P0 targets include phone and direct_head in IMAGE_NORM", () => {
  const targets = p0Targets();
  const byId = Object.fromEntries(targets.map((t) => [t.id, t]));
  assert.ok(byId.phone);
  assert.ok(byId.direct_head);
  assert.equal(byId.phone.coordinate_space, "IMAGE_NORM");
  assert.equal(byId.direct_head.coordinate_space, "IMAGE_NORM");
  assert.equal(byId.phone.target.length, 2);
  assert.equal(byId.direct_head.target.length, 2);
});

test("createApp residuals.direct_head and residuals.phone", () => {
  const app = createApp();
  const residuals = app.getEffective().residuals;
  assert.ok(residuals.direct_head);
  assert.ok("requested" in residuals.direct_head);
  assert.ok("effective" in residuals.direct_head);
  assert.ok("residual" in residuals.direct_head);
  if (residuals.direct_head.residual !== null) {
    assert.equal(typeof residuals.direct_head.residual, "number");
  }
  assert.equal(typeof residuals.phone.residual, "number");
  assert.ok(Number.isFinite(residuals.phone.residual));
});

test("changing Q does not change residuals.phone", () => {
  const app = createApp();
  const before = app.getEffective().residuals.phone;
  assert.equal(typeof before.residual, "number");
  const residual0 = before.residual;
  const e0 = before.effective;
  app.dispatch("SET_CONTENT_Q", { scale: 0.4, offset: [0.1, 0.1] });
  const after = app.getEffective().residuals.phone;
  assert.ok(Math.abs(after.residual - residual0) < 1e-12);
  assert.ok(Math.hypot(after.effective[0] - e0[0], after.effective[1] - e0[1]) < 1e-12);
});

test("projectWorld IMAGE_NORM y=0 at top", () => {
  const cam = {
    world: { translation: [0, 0, 0] },
    basis: { right: [1, 0, 0], up: [0, 0, 1], forward: [0, 1, 0] },
    fx: 500,
    fy: 500,
    cx: 500,
    cy: 500,
    width_px: 1000,
    height_px: 1000,
  };
  const above = [0, 1, 0.2];
  const p = projectWorld(above, cam);
  assert.equal(p.valid, true);
  assert.ok(p.v > cam.cy);
  assert.ok(p.image_norm[1] < 0.5);
  const principal = projectWorld([0, 1, 0], cam);
  assert.ok(Math.abs(principal.u - cam.cx) < 1e-9);
  assert.ok(Math.abs(principal.v - cam.cy) < 1e-9);
  assert.ok(Math.abs(principal.image_norm[0] - 0.5) < 1e-9);
  assert.ok(Math.abs(principal.image_norm[1] - 0.5) < 1e-9);
});
