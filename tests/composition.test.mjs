import test from "node:test";
import assert from "node:assert/strict";
import { p0Targets, SUBJECT_MAP } from "../src/domains/composition/targets.js";
import { projectWorld } from "../src/domains/visibility/report.js";
import { createApp } from "../src/app/facade.js";
import { projectForHud } from "../src/ui/adapters/selector_projection_adapter.js";

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

test("eyes and mouth are not measured from head FK", () => {
  assert.equal(SUBJECT_MAP.direct_head.fk, "head");
  assert.equal(SUBJECT_MAP.direct_eye_L.fk, null);
  assert.equal(SUBJECT_MAP.direct_eye_R.fk, null);
  assert.equal(SUBJECT_MAP.direct_mouth.fk, null);
  const app = createApp();
  const res = app.getEffective().residuals;
  const head = res.direct_head;
  assert.equal(typeof head.residual, "number");
  for (const id of ["direct_eye_L", "direct_eye_R", "direct_mouth"]) {
    assert.equal(res[id].residual, null, id);
    assert.equal(res[id].effective, null, id);
    assert.equal(res[id].reason, "NO_DISTINCT_FK", id);
  }
  const measured = Object.values(res).filter((r) => typeof r.residual === "number").map((r) => r.residual);
  assert.equal(app.getEffective().composition_metrics.max_residual, Math.max(...measured));
});

test("transaction looks at composition residuals", () => {
  const app = createApp();
  const e = app.getEffective();
  assert.equal(e.transaction, "PROJECTED");
  const head = e.constraints.find((c) => c.constraint_id === "target_direct_head");
  assert.ok(head);
  assert.ok(head.state === "PROJECTED" || head.state === "PASS");
  const phone = e.constraints.find((c) => c.constraint_id === "target_phone");
  assert.equal(phone.state, "PASS");
  assert.equal(e.constraints.some((c) => c.constraint_id === "target_direct_eye_L"), false);
  const hud = projectForHud(app);
  assert.equal(hud.valid, false);
  assert.ok(hud.reasons.some((r) => String(r).includes("target_")));
});

test("layout fit reduces capture head-phone gap; optics stay locked", () => {
  const app = createApp();
  const e = app.getEffective();
  const m = e.composition_metrics;
  assert.ok(Number.isFinite(m.gap_residual));
  assert.ok(m.layout_fit?.gap_residual < 0.12, `layout gap ${m.layout_fit?.gap_residual}`);
  assert.ok(m.layout_fit?.accepted);
  assert.equal(m.layout_fit.optical_lock, true);
  assert.equal(e.feasible.inside, true);
  assert.equal(e.camera.mount, "FRONT");
  assert.equal(e.camera.same_side_as_screen, true);
  const f = e.camera.basis.forward;
  const n = e.mirror.basis.n;
  const sn = e.phone.screen_normal;
  assert.ok(Math.abs(sn[0] * f[0] + sn[1] * f[1] + sn[2] * f[2] - 1) < 1e-6);
  assert.ok(Math.abs(n[0] * f[0] + n[1] * f[1] + n[2] * f[2] + 1) < 1e-6);
  assert.equal(e.carrier_p.valid, true);
  assert.ok(e.residuals.phone.residual < 1e-6);
  assert.equal(app.getRequested().camera.crop_request.scale, 1);
  const C = e.camera.world.translation;
  const along = (X) => (X[0] - C[0]) * f[0] + (X[1] - C[1]) * f[1] + (X[2] - C[2]) * f[2];
  assert.ok(along(e.phone.screen_corners_world[0]) < along(e.skeleton.fk.head));
  assert.ok(along(e.skeleton.fk.head) < along(e.mirror.centre));
});

test("MOVE_PHONE does not re-run layout fit", () => {
  const app = createApp();
  const t0 = app.getRequested().phone.transform_request.translation.slice();
  app.dispatch("MOVE_PHONE", { translation: [t0[0] + 0.07, t0[1], t0[2]] });
  const t1 = app.getRequested().phone.transform_request.translation;
  assert.ok(Math.abs(t1[0] - (t0[0] + 0.07)) < 1e-12);
  assert.ok(Math.abs(t1[2] - t0[2]) < 1e-12);
  assert.equal(app.getEffective().composition_metrics.layout_fit, undefined);
});
