import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";

test("ACC-TXN-01 · preview does not grow undo history", () => {
  const app = createApp();
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 1.6 }, { label: "seed" });
  const before = app.lastHistoryLabel();
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 1.7 }, { preview: true });
  assert.equal(app.lastHistoryLabel(), before);
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 1.8 }, { label: "commit" });
  assert.equal(app.lastHistoryLabel(), "commit");
});

test("ACC-TXN-01b · undo restores prior committed state", () => {
  const app = createApp();
  const d0 = app.getRequested().apparatus.mirror_distance_request_m;
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: d0 + 0.2 }, { label: "move mirror" });
  assert.ok(Math.abs(app.getRequested().apparatus.mirror_distance_request_m - (d0 + 0.2)) < 1e-6);
  app.dispatch("UNDO");
  assert.ok(Math.abs(app.getRequested().apparatus.mirror_distance_request_m - d0) < 1e-6);
});
