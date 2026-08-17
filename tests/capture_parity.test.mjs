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

test("ACC-CAM-01a · Three render camera optical axis equals the physical camera forward basis", async () => {
  globalThis.self ??= globalThis;
  const THREE = await import("three");
  const eff = createApp().getEffective();
  const cap = new CaptureCamera(THREE);
  cap.mode = "FULL_SENSOR";
  cap.apply(eff);
  const d = new THREE.Vector3();
  cap.cam.getWorldDirection(d);
  const f = new THREE.Vector3(...eff.camera.basis.forward).normalize();
  assert.ok(d.dot(f) > 1 - 1e-10, `render forward ${d.toArray()} vs physical ${f.toArray()}`);
});

test("ACC-CAM-01b · actual Three full-sensor projection matches solver projection <2 px", async () => {
  globalThis.self ??= globalThis;
  const THREE = await import("three");
  const eff = createApp().getEffective();
  const cap = new CaptureCamera(THREE);
  cap.mode = "FULL_SENSOR";
  cap.apply(eff);
  for (const id of ["face_reference", "pelvis", "shoulder_R", "knee_L"]) {
    const X = eff.skeleton.fk[id];
    assert.ok(X, id);
    const v = new THREE.Vector3(...X).project(cap.cam);
    const actual = [(v.x + 1) / 2, (1 - v.y) / 2];
    const expected = projectWorld(X, eff.camera).image_norm_capture;
    assert.ok(expected, id);
    const dx = (actual[0] - expected[0]) * eff.camera.width_px;
    const dy = (actual[1] - expected[1]) * eff.camera.height_px;
    assert.ok(Math.hypot(dx, dy) < 2, `${id}: ${Math.hypot(dx,dy)} px; actual=${actual} expected=${expected}`);
  }
});

test("ACC-CAM-01 · preview/export final-crop math of the same landmark stays <2 px", async () => {
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
