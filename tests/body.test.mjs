import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSkeleton, SEMANTIC } from "../src/domains/body/skeleton.js";
import { defaultRequestedState } from "../src/scene/requested_state.js";
import { createApp } from "../src/app/facade.js";

test("glb skeleton maps semantic bones", () => {
  assert.equal(SEMANTIC.pelvis, "Hips_00");
  assert.equal(SEMANTIC.wrist_R, "Hand.R_037");
  const skel = evaluateSkeleton(defaultRequestedState());
  assert.ok(skel.fk.pelvis);
  assert.ok(skel.fk.head);
  assert.ok(skel.fk.wrist_R);
  assert.equal(skel.glb, "fixtures/P0/base_female_rigged.glb");
});

test("P0 reconstruct residuals are explicit", () => {
  const app = createApp();
  const res = app.getEffective().residuals;
  assert.ok(res.direct_head);
  assert.ok("residual" in res.direct_head);
  assert.ok("requested" in res.phone);
});
