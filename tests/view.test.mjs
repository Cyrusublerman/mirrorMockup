import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { ViewState, EDITOR_VIEWS } from "../src/ui/state/view_state.js";
import { FramingPolicy } from "../src/render/framing_policy.js";
import { IK_JOINTS } from "../src/render/bone_index.js";

test("six editor views; swap preserves editor_view", () => {
  assert.deepEqual([...EDITOR_VIEWS], ["FRONT", "BACK", "LEFT", "RIGHT", "TOP", "ISO"]);
  const v = new ViewState();
  v.setEditorView("LEFT");
  v.swap();
  assert.equal(v.main_pane, "CAPTURE");
  assert.equal(v.editor_view, "LEFT");
  v.swap();
  assert.equal(v.main_pane, "EDITOR");
  assert.equal(v.editor_view, "LEFT");
});

test("body framing ignores mirror distance; apparatus framing does not write camera", () => {
  const app = createApp();
  const fk = app.getEffective().skeleton.fk;
  const cam0 = structuredClone(app.getEffective().camera);
  const policy = new FramingPolicy();
  const poseA = policy.fitBody(fk);
  app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false });
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 6.5 });
  const poseB = policy.fitBody(fk);
  assert.equal(poseA.target[0], poseB.target[0]);
  assert.equal(poseA.target[1], poseB.target[1]);
  assert.equal(poseA.target[2], poseB.target[2]);
  const sceneFit = policy.fitApparatus(app.getEffective());
  assert.ok(sceneFit.radius > poseB.radius);
  const cam1 = app.getEffective().camera;
  assert.deepEqual(cam1.world.translation, cam0.world.translation);
  assert.equal(cam1.hfov, cam0.hfov);
});

test("head is not an IK joint", () => {
  assert.equal(IK_JOINTS.includes("head"), false);
  assert.ok(IK_JOINTS.includes("wrist_R"));
});
