import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { bttKey, AXIS_TO_BTT } from "../src/ui/axis_map.js";
import { ContextualDock } from "../src/ui/hud/contextual_dock.js";

test("preview does not commit requested until commitPreview", () => {
  const app = createApp();
  const d0 = app.getRequested().apparatus.mirror_distance_request_m;
  app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false });
  const base = app.getRequested().apparatus.mirror_distance_request_m;
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 1.11 }, { preview: true });
  assert.equal(app.getRequested().apparatus.mirror_distance_request_m, 1.11);
  app.discardPreview();
  assert.equal(app.getRequested().apparatus.mirror_distance_request_m, base);
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 1.22 }, { preview: true });
  app.commitPreview();
  assert.equal(app.getRequested().apparatus.mirror_distance_request_m, 1.22);
  assert.ok(d0);
});

test("ROTATE maps to twist", () => {
  assert.equal(bttKey("ROTATE"), "twist");
  assert.equal(AXIS_TO_BTT.BEND, "bend");
});

test("ContextualDock classifies head wrist phone mirror camera", () => {
  const d = new ContextualDock();
  assert.equal(d.kindOf({ kind: "joint", id: "head" }), "HEAD");
  assert.equal(d.kindOf({ kind: "joint", id: "wrist_R" }), "WRIST");
  assert.equal(d.kindOf({ kind: "phone" }), "PHONE");
  assert.equal(d.kindOf({ kind: "mirror", id: "d_M" }), "MIRROR");
  assert.equal(d.kindOf({ kind: "crop" }), "CAMERA");
});
