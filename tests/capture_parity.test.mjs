import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { CaptureCamera, vfovFromHfov } from "../src/render/capture_camera.js";
import { projectWorld } from "../src/domains/visibility/report.js";

test("ACC-CAM-02 · vfov = 2·atan((H/W)·tan(hfov/2))", () => {
  const W = 1170;
  const H = 1560;
  const hfov = (70 * Math.PI) / 180;
  const vfov = vfovFromHfov(hfov, W, H);
  assert.ok(Math.abs((vfov * 180) / Math.PI - 86.1) < 0.2);
  const cam = createApp().getEffective().camera;
  assert.ok(Math.abs(cam.vfov - vfovFromHfov(cam.hfov, cam.width_px, cam.height_px)) < 1e-12);
});

test("ACC-CAM-01 · preview vs export projection of the same landmark", async () => {
  globalThis.self ??= globalThis;
  const THREE = await import("three");
  const app = createApp();
  const eff = app.getEffective();
  const cap = new CaptureCamera(THREE);
  cap.mode = "FINAL_CROP";
  cap.apply(eff);
  const head = eff.skeleton.fk.head;
  const uv = cap.projectFinal(head, eff);
  const dom = projectWorld(head, eff.camera);
  assert.ok(uv);
  assert.ok(dom.image_norm);
  const dx = (uv[0] - dom.image_norm[0]) * eff.camera.width_px;
  const dy = (uv[1] - dom.image_norm[1]) * eff.camera.height_px;
  assert.ok(Math.hypot(dx, dy) < 2);
});
