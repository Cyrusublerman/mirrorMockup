import test from "node:test";
import assert from "node:assert/strict";
import { OUTPUT_MODES } from "../src/ui/state/phase_state.js";
import { PANELS_AI } from "../fixtures/reference/panels_ai.js";
import { FeasiblePanel } from "../src/ui/hud/feasible_panel.js";
import { MaskCompare } from "../src/domains/composition/mask_compare.js";
import { declaredReferenceMask } from "../fixtures/reference/declared_masks.js";

test("Phase 7 · MASK is a reachable output mode",()=>assert.ok(OUTPUT_MODES.includes("MASK")));
test("Phase 7 · all A–I panels plot on feasible-map data",()=>{assert.deepEqual(Object.keys(PANELS_AI),["A","B","C","D","E","F","G","H","I"]);const dots=new FeasiblePanel().dots();assert.equal(dots.length,9);assert.ok(dots.every((d)=>Number.isFinite(d.a)&&Number.isFinite(d.e)));});
test("Phase 7 · declared reference has pixel labels and per-part IoU",()=>{const ref=declaredReferenceMask(180,240);assert.equal(ref.labels.length,180*240);const cmp=new MaskCompare().compareDeclared(ref.labels,180,240);assert.ok(cmp.weighted>.99);for(const v of Object.values(cmp.parts))assert.ok(v>.99);});
