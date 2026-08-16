import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";

test("Phases 5–8 · composition fit and feasible projection agree", () => {
  const e = createApp().getEffective();
  const finalGap = e.composition_metrics?.gap_residual;
  const boundary = e.feasible?.distance_to_boundary;
  assert.equal(e.feasible?.inside, true, `feasible boundary ${boundary}`);
  assert.ok(
    Number.isFinite(finalGap) && finalGap < 0.12,
    `final gap ${finalGap}; feasible boundary ${boundary}`,
  );
});
