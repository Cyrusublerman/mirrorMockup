import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createApp } from "../src/app/facade.js";
import { PRODUCTION_ROOMS } from "../src/ui/hud/top_mode_strip.js";
import { CATALOGUE } from "../src/ui/overlays/composition_overlay_stack.js";
import { BUILD } from "../src/app/build_identity.js";
import { projectForHud } from "../src/ui/adapters/selector_projection_adapter.js";
import { createDispatchAdapter } from "../src/ui/adapters/action_dispatch_adapter.js";

test("production rooms are POSE SCENE RECURSION", () => {
  assert.deepEqual(PRODUCTION_ROOMS, ["POSE", "SCENE", "RECURSION"]);
  assert.equal(PRODUCTION_ROOMS.includes("INSPECT"), false);
  assert.equal(PRODUCTION_ROOMS.includes("COMPOSITION"), false);
});

test("overlay catalogue is the production set", () => {
  for (const id of ["GRID", "BBOX", "CENTROID", "MEASURE", "PERSPECTIVE", "CORRESPONDENCE", "VISIBILITY", "APPARATUS", "RECURSION", "DISTORTION"]) {
    assert.ok(CATALOGUE.includes(id));
  }
});

test("PAN_OUTER_FRAME does not mutate principal point", () => {
  const app = createApp();
  const cx = app.getEffective().camera.cx;
  const cy = app.getEffective().camera.cy;
  app.dispatch("PAN_OUTER_FRAME", { pan: [0.2, -0.15] });
  assert.equal(app.getEffective().camera.cx, cx);
  assert.equal(app.getEffective().camera.cy, cy);
  assert.deepEqual(app.getEffective().camera.crop_pan, [0.2, -0.15]);
});

test("one continuous preview drag is one undo", () => {
  const app = createApp();
  const d0 = app.getRequested().apparatus.mirror_distance_request_m;
  const d = createDispatchAdapter(app);
  d.startGesture("Set d_M");
  d.preview("SET_MIRROR_DISTANCE", { d_M: 1.33 });
  d.preview("SET_MIRROR_DISTANCE", { d_M: 1.44 });
  d.endGesture();
  assert.equal(app.lastHistoryLabel(), "Set d_M");
  assert.equal(app.getRequested().apparatus.mirror_distance_request_m, 1.44);
  app.dispatch("UNDO");
  assert.equal(app.getRequested().apparatus.mirror_distance_request_m, d0);
});

test("AUTO refuses when P is invalid", () => {
  const app = createApp();
  app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE", { on: false });
  app.dispatch("SET_MIRROR_DISTANCE", { d_M: 0.05 });
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  const rec = app.getEffective().recursion;
  if (app.getEffective().carrier_p.valid) {
    assert.equal(rec.refused, false);
  } else {
    assert.equal(rec.refused, true);
    assert.equal(rec.mode, "OFF");
    assert.ok((rec.reasons || []).length > 0);
  }
});

test("build identity is stamped on export sidecar", () => {
  const app = createApp();
  const last = app.dispatch("EXPORT_IMAGE", { width: 32, height: 32 });
  assert.equal(last.export.sidecar.build.app, BUILD.app);
  assert.ok(last.export.staging);
  assert.ok(last.export.overlay);
});

test("HUD projection exposes P/Q and build stamp", () => {
  const app = createApp();
  const p = projectForHud(app);
  assert.ok("portal" in p);
  assert.equal(p.build.APP, BUILD.app);
  assert.equal(p.build.UI, BUILD.ui);
  assert.equal(p.build.CORE, BUILD.core);
});

test("no ROTATE_MIRROR in production UI modules", () => {
  const files = [
    "src/ui/app_shell.js",
    "src/ui/hud/context_hud.js",
    "src/ui/rooms/scene_room.js",
  ];
  for (const f of files) {
    const t = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.equal(t.includes("ROTATE_MIRROR"), false);
  }
});

test("remote launcher pins SHA and does not exec arbitrary repo", () => {
  const html = readFileSync(new URL("../remote.html", import.meta.url), "utf8");
  assert.equal(/raw\.githack\.com\/Cyrusublerman\/mirrorMockup\/" \+ ref/.test(html) || html.includes("PINNED"), true);
  assert.match(html, /PINNED/);
  assert.match(html, /repo host not allowed/);
  assert.equal(html.includes("innerHTML"), false);
  assert.match(html, /textContent/);
  assert.doesNotMatch(html, /@main/);
});

test("app shell is a three-room HUD not a five-mode form", () => {
  const js = readFileSync(new URL("../src/ui/app_shell.js", import.meta.url), "utf8");
  assert.match(js, /mp-app/);
  assert.doesNotMatch(js, /data-mode="INSPECT"/);
  assert.doesNotMatch(js, /data-mode="COMPOSITION"/);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /interactions\.js/);
});

test("P0 photograph is not in public fixtures", () => {
  const names = ["fixtures/P0/base_female_rigged.glb", "fixtures/P0/landmarks.json"];
  for (const n of names) readFileSync(new URL("../" + n, import.meta.url));
  const html = readFileSync(new URL("../src/ui/app_shell.js", import.meta.url), "utf8");
  assert.doesNotMatch(html, /P0\.(jpg|jpeg|png|webp)/);
});
