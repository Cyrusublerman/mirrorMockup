import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSkeleton, restLocals, applyPoseRotations, SEMANTIC } from "../src/domains/body/skeleton.js";
import * as quat from "../src/shared_math/quaternion.js";
import { defaultRequestedState } from "../src/scene/requested_state.js";
import { createApp } from "../src/app/facade.js";
import { distance } from "../src/shared_math/vector.js";

test("glb skeleton maps semantic bones", () => {
  assert.equal(SEMANTIC.pelvis, "Hips_00");
  assert.equal(SEMANTIC.wrist_R, "Hand.R_037");
  const skel = evaluateSkeleton(defaultRequestedState());
  assert.ok(skel.fk.pelvis);
  assert.ok(skel.fk.head);
  assert.ok(skel.fk.wrist_R);
  assert.equal(skel.glb, "fixtures/P0/base_female_rigged.glb");
});

test("pose deltas multiply Mixamo rest locals", () => {
  const rest = restLocals();
  const q = quat.fromAxisAngle([1, 0, 0], 0.3);
  const posed = applyPoseRotations(rest, { elbow_R: q });
  const bone = SEMANTIC.elbow_R;
  const expected = quat.normalize(quat.multiply(rest[bone].rotation, q));
  assert.equal(posed[bone].rotation.length, 4);
  for (let i = 0; i < 4; i++) {
    assert.ok(Math.abs(posed[bone].rotation[i] - expected[i]) < 1e-9);
  }
});

test("PHONE_DRIVES_HAND writes GLB arm toward the phone prism", () => {
  const app = createApp();
  const eff = app.getEffective();
  assert.equal(app.getRequested().body.definition.glb, "fixtures/P0/base_female_rigged.glb");
  const wrist = eff.skeleton.fk.wrist_R;
  const grip = eff.phone.grip_world.translation;
  assert.ok(distance(wrist, grip) < 0.03);
  const restElbow = restLocals()[SEMANTIC.elbow_R].rotation;
  const posedElbow = eff.skeleton.locals[SEMANTIC.elbow_R].rotation;
  assert.ok(distance(posedElbow.slice(0, 3), restElbow.slice(0, 3)) > 1e-4 || Math.abs(posedElbow[3] - restElbow[3]) > 1e-4);
});

test("P0 reconstruct residuals are explicit", () => {
  const app = createApp();
  const res = app.getEffective().residuals;
  assert.ok(res.direct_head);
  assert.ok("residual" in res.direct_head);
  assert.ok("requested" in res.phone);
});
