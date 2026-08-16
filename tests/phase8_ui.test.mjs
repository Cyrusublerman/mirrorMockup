import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OUTPUT_MODES } from "../src/ui/state/phase_state.js";
import { PANELS_AI } from "../fixtures/reference/panels_ai.js";
import { FeasiblePanel } from "../src/ui/hud/feasible_panel.js";
import { MaskCompare } from "../src/domains/composition/mask_compare.js";
import { renderMaskRgba } from "../src/domains/export/image.js";

test("Phase 8 · MASK is a reachable output mode and export", () => {
  assert.ok(OUTPUT_MODES.includes("MASK"));
  const shell = readFileSync(new URL("../src/ui/app_shell.js", import.meta.url), "utf8");
  assert.match(shell, /EXPORT_MASK/);
  assert.match(shell, /mask\.png/);
});

test("Phase 8 · A–I all plot on feasible map data", () => {
  assert.deepEqual(Object.keys(PANELS_AI), ["A", "B", "C", "D", "E", "F", "G", "H", "I"]);
  const dots = new FeasiblePanel().dots();
  assert.equal(dots.length, 9);
  assert.deepEqual(dots.map((d) => d.id), Object.keys(PANELS_AI));
  assert.ok(dots.every((d) => Number.isFinite(d.a) && Number.isFinite(d.e)));
});

test("Phase 8 · per-part IoU and mask renderer are available", () => {
  const cmp = new MaskCompare();
  const parts = cmp.perPart([1, 1, 2, 0], [1, 2, 2, 0], [1, 2]);
  assert.equal(typeof parts[1], "number");
  assert.equal(typeof parts[2], "number");
  const rgba = renderMaskRgba({ mask_labels: [0, 1, 2, 3] }, 2, 2);
  assert.equal(rgba.length, 16);
  assert.ok(rgba.every((v) => Number.isInteger(v)));
});
