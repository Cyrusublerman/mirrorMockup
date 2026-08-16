import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTION_ROOMS } from "../src/ui/hud/top_mode_strip.js";
import { hitScreenCorner, inverseCorner } from "../src/ui/manipulators/screen_quad.js";

test("Phase 7 · production navigation remains POSE SCENE RECURSION", () => {
  assert.deepEqual(PRODUCTION_ROOMS, ["POSE", "SCENE", "RECURSION"]);
  const strip = readFileSync(new URL("../src/ui/hud/top_mode_strip.js", import.meta.url), "utf8");
  assert.doesNotMatch(strip, /DECLARE|STAGE/);
});

test("Phase 7 · capture dragger targets all four P corners", () => {
  const quad = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]];
  for (let i = 0; i < 4; i++) assert.equal(hitScreenCorner(quad, quad[i], 0.02), i);
  assert.equal(hitScreenCorner(quad, [0.5, 0.5], 0.02), -1);
});

test("Phase 7 · screen drag wiring uses P while Q remains content state", () => {
  const shell = readFileSync(new URL("../src/ui/app_shell.js", import.meta.url), "utf8");
  assert.match(shell, /portal\?\.P\?\.quad/);
  assert.match(shell, /hitScreenCorner/);
  assert.match(shell, /screen_corner/);
  assert.match(shell, /inverseCorner/);
  assert.match(shell, /applyScreenCorner/);
  assert.match(shell, /content_q\.offset/);
});

test("Phase 7 · inverse corner maps image drag into camera basis", () => {
  const p = inverseCorner([0, 0, 0], { right: [1, 0, 0], up: [0, 0, 1] }, [0.1, -0.2], 1);
  assert.deepEqual(p, [0.1, 0, 0.2]);
});
