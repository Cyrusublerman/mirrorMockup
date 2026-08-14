import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { CaptureCamera, verticalFovFromHorizontal } from "../src/render/capture_camera.js";
import { projectWorld } from "../src/domains/visibility/report.js";
import { t } from "../fixtures/tolerances.js";

globalThis.self = globalThis;

test("vfov from hfov uses sensor aspect not canvas aspect", () => {
  const W = 1170;
  const H = 1560;
  const hfov = (70 * Math.PI) / 180;
  const vfov = verticalFovFromHorizontal(hfov, W, H);
  assert.ok(Math.abs(vfov * 180 / Math.PI - 86.1) < 0.2);
});

test("CaptureCamera landmark matches domain projection within 2 px", async () => {
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
  const W = eff.camera.width_px;
  const H = eff.camera.height_px;
  const dx = (uv[0] - dom.image_norm[0]) * W;
  const dy = (uv[1] - dom.image_norm[1]) * H;
  const px = Math.hypot(dx, dy);
  assert.ok(px < t("T-CAPTURE-PX"), `Δpx=${px}`);
});
