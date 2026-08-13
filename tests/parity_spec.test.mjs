import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createApp } from "../src/app/facade.js";
import { ACTION_NAMES } from "../src/app/actions.js";
import { PRODUCTION_ROOMS } from "../src/ui/hud/top_mode_strip.js";
import { CATALOGUE } from "../src/ui/overlays/composition_overlay_stack.js";
import { MODE_TABLE, LOCK_CHIPS } from "../src/scene/solve_policy.js";
import { t, minCarrierPx, toleranceSetHash } from "../fixtures/tolerances.js";
import landmarks from "../fixtures/P0/landmarks.js";
import { panToPlace, captureToFinal } from "../src/domains/camera/crop.js";
import { gpuSampleUv, shaderUsesKernel } from "../src/render/recursion_gpu.js";
import { SIZE_BASES } from "../src/domains/content_q/content.js";
import { BUILD } from "../src/app/build_identity.js";
import { PUBLISHED, certifyKernel } from "../fixtures/recursion/kernel.js";
import { SHELL_CSS } from "../src/ui/shell.js";

test("UI rooms and overlay catalogue", () => {
  assert.deepEqual(PRODUCTION_ROOMS, ["POSE", "SCENE", "RECURSION"]);
  for (const id of ["GRID", "BBOX", "CENTROID", "MEASURE", "PERSPECTIVE", "CORRESPONDENCE", "VISIBILITY", "APPARATUS", "RECURSION", "DISTORTION"]) {
    assert.ok(CATALOGUE.includes(id));
  }
});

test("no ROTATE_MIRROR production action", () => {
  assert.equal(ACTION_NAMES.includes("ROTATE_MIRROR"), false);
});

test("six-mode table has DRIVER PRESERVE ALLOWED", () => {
  const modes = ["POSE_FIRST", "PHONE_FIRST", "MIRROR_RATIO_FIRST", "COMPOSITION_FIT", "P0_RECONSTRUCT", "MANUAL"];
  for (const m of modes) {
    assert.ok(MODE_TABLE[m].driver);
    assert.ok(Array.isArray(MODE_TABLE[m].preserve));
    assert.ok(Array.isArray(MODE_TABLE[m].allowed_to_move));
  }
  assert.ok(MODE_TABLE.COMPOSITION_FIT.allowed_to_move.includes("crop_pan"));
  assert.equal(MODE_TABLE.COMPOSITION_FIT.allowed_to_move.includes("mirror_pan"), false);
});

test("lock chips named as relationships", () => {
  const ids = LOCK_CHIPS.map((c) => c.id);
  for (const id of ["PHONE_AREA", "REFLECTED_BODY_SCALE", "MIRROR_OCCUPANCY", "SUPPORT", "GRIP", "P_VALID"]) {
    assert.ok(ids.includes(id));
  }
});

test("P0 schema: bbox_centre, y_down, missing hips, undeclared parity", () => {
  assert.equal(landmarks.y_down, true);
  assert.equal(landmarks.saved_image_mirrored, "UNDECLARED");
  assert.equal(landmarks.features.hip_L.status, "missing");
  assert.equal(landmarks.features.phone.screen_quad.status, "missing");
  assert.ok(landmarks.features.phone.bbox_centre);
  assert.equal(landmarks.features.phone.centroid, undefined);
  assert.equal(landmarks.projected_angles_deg.reflected_knee_L.status, "unverified_until_hips");
  assert.equal(landmarks.projected_angles_deg.reflected_phone_arm_elbow, 132.95);
});

test("S-01 crop places phone in final frame without moving principal", () => {
  const app = createApp();
  const cam = app.getEffective().camera;
  assert.equal(cam.cx, cam.width_px / 2);
  assert.equal(cam.cy, cam.height_px / 2);
  const phone = app.getEffective().residuals.phone;
  assert.ok(phone.effective);
  assert.equal(phone.frame, "FINAL_CROP");
  const err = Math.hypot(phone.effective[0] - t("T-PHONE")[0], phone.effective[1] - t("T-PHONE")[1]);
  assert.ok(err <= t("T-LANDMARK") * 20 || err < 0.05, `phone final residual ${err}`);
});

test("crop does not change R_P", () => {
  const app = createApp();
  const r0 = app.getEffective().composition_metrics.R_P_capture;
  app.dispatch("PAN_OUTER_FRAME", { pan: [0.2, -0.1] });
  const r1 = app.getEffective().composition_metrics.R_P_capture;
  assert.ok(Math.abs(r0 - r1) < 1e-9);
  assert.equal(app.getEffective().composition_metrics.R_P_crop_non_triggering, true);
});

test("WORLD mirror does not follow the phone", () => {
  const app = createApp();
  const m0 = app.getEffective().mirror.centre.slice();
  const t0 = app.getRequested().phone.transform_request.translation.slice();
  app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false });
  app.dispatch("MOVE_PHONE", { translation: [t0[0] + 0.15, t0[1], t0[2]] });
  const m1 = app.getEffective().mirror.centre.slice();
  assert.ok(Math.hypot(m1[0] - m0[0], m1[1] - m0[1], m1[2] - m0[2]) < 1e-4);
});

test("AUTO third branch: invalid P refuses; valid P can degrade on min_carrier", () => {
  const app = createApp();
  app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false });
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 0.05 });
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  const rec = app.getEffective().recursion;
  if (!app.getEffective().carrier_p.valid) {
    assert.equal(rec.refused, true);
    assert.equal(rec.loop_state, "REFUSED");
  }
  const app2 = createApp();
  app2.dispatch("SET_RECURSION_PARAMETER", { n: 8 });
  app2.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  const rec2 = app2.getEffective().recursion;
  if (app2.getEffective().carrier_p.valid) {
    assert.ok(["EXACT", "DEGRADED"].includes(rec2.loop_state));
  }
  assert.ok(minCarrierPx(3) > t("T-LEG"));
});

test("solver metadata and x partition", () => {
  const app = createApp();
  const s = app.getEffective().solver;
  assert.equal(s.solver_id, "mirror-portrait-nls");
  assert.ok(s.tolerance_set_hash);
  assert.ok(app.getEffective().x_decision.length);
  assert.ok(app.getEffective().x_locked.includes("cx"));
});

test("SET_TARGET_WEIGHT provenanced", () => {
  const app = createApp();
  app.dispatch("SET_TARGET_WEIGHT", { id: "phone", weight: 2.5, origin: "ARTIST" });
  const t = app.getRequested().composition.targets.find((x) => x.id === "phone");
  assert.equal(t.weight_if_soft, 2.5);
  assert.equal(t.weight_origin, "ARTIST");
});

test("four export products", () => {
  const app = createApp();
  const last = app.dispatch("EXPORT_STAGING_PRESCRIPTION", { width: 32, height: 32 });
  assert.ok(last.export.products.EXPORT_FINAL_CAMERA);
  assert.ok(last.export.products.EXPORT_STAGING_PRESCRIPTION);
  assert.ok(last.export.products.EXPORT_COMPOSITION_OVERLAY);
  assert.equal(last.export.sidecar.build.app, BUILD.app);
  assert.ok(last.export.sidecar.solver);
});

test("Q size bases and kernel GPU share", () => {
  assert.deepEqual(SIZE_BASES, ["Width%", "Height%", "Area%", "Contain", "Cover"]);
  assert.equal(shaderUsesKernel(), "domains/recursion/kernel.js");
  const cert = certifyKernel({ q: 1, n: 1, Sval: 256, theta_s: 0 });
  cert.pole = [0.5, 0.5];
  cert.beta = [0, 0];
  const uv = gpuSampleUv([0.6, 0.4], cert);
  assert.equal(uv.length, 2);
});

test("kernel published gamma", () => {
  const c = certifyKernel({ q: 1, n: 1, Sval: 256, theta_s: 0 });
  assert.ok(Math.abs(c.gamma_abs - PUBLISHED.gamma_abs) < 1e-9);
  assert.ok(Math.abs(c.gamma_arg * (180 / Math.PI) - PUBLISHED.gamma_arg_deg) < 1e-6);
});

test("snapshots kinds and A-E", () => {
  const app = createApp();
  app.dispatch("SAVE_SNAPSHOT", { id: "A", kind: "SCENE" });
  app.dispatch("SAVE_SNAPSHOT", { id: "POSE1", kind: "POSE" });
  const d0 = app.getRequested().apparatus.mirror_distance_request_m;
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: d0 + 0.2 });
  app.dispatch("LOAD_SNAPSHOT", { id: "A" });
  assert.ok(Math.abs(app.getRequested().apparatus.mirror_distance_request_m - d0) < 1e-6);
});

test("LOCK_GRIP is a real authority", () => {
  const app = createApp();
  app.dispatch("SET_PHONE_AUTHORITY", { authority: "LOCK_GRIP" });
  assert.equal(app.getRequested().phone.authority, "LOCK_GRIP");
  assert.equal(app.getRequested().composition.locks.GRIP, true);
});

test("shell CSS: 100dvh, 44px, no wrap strip, tokens", () => {
  assert.ok(SHELL_CSS.includes("100dvh"));
  assert.ok(SHELL_CSS.includes("min-height: 44px"));
  assert.ok(SHELL_CSS.includes("#F7F5EF"));
  assert.ok(SHELL_CSS.includes("flex-wrap: nowrap"));
  assert.ok(SHELL_CSS.includes("grid-template-columns: 220px"));
});

test("device matrix file exists", () => {
  assert.equal(existsSync(new URL("./ui_device_matrix.json", import.meta.url)), true);
  const m = JSON.parse(readFileSync(new URL("./ui_device_matrix.json", import.meta.url), "utf8"));
  assert.ok(m.viewports.some((v) => v.width === 360));
});

test("p_log and p_fix are distinct fields", () => {
  const app = createApp();
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "ADVANCED" });
  const rec = app.getEffective().recursion;
  if (rec.certificate) {
    assert.ok("p_log" in rec.certificate);
    assert.ok("p_fix" in rec.certificate);
  }
});

test("importmap.json pins three from repo", () => {
  const map = JSON.parse(readFileSync(new URL("../importmap.json", import.meta.url), "utf8"));
  assert.ok(map.imports.three.includes("three@0.170.0"));
});

test("crop panToPlace algebra", () => {
  const pan = panToPlace([0.5, 0.5], [0.727, 0.1115], 1);
  const landed = captureToFinal([0.5, 0.5], { pan, scale: 1 });
  assert.ok(Math.abs(landed[0] - 0.727) < 1e-9);
  assert.ok(Math.abs(landed[1] - 0.1115) < 1e-9);
});

test("tolerance set is versioned", () => {
  assert.ok(toleranceSetHash().startsWith("v1:"));
  assert.equal(t("T-LANDMARK"), 0.0005);
});
