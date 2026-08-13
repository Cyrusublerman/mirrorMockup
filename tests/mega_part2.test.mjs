import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { solve } from "../src/scene/orchestrator.js";
import { defaultRequestedState } from "../src/scene/requested_state.js";
import { identityWarp } from "../src/domains/domain_warp/warp.js";
import { evaluateContradiction } from "../src/domains/contradiction/layer.js";

test("Part II L0 L1 L2 are named and P is not Q", () => {
  const app = createApp();
  const e = app.getEffective();
  assert.equal(e.layers.L0.id, "L0");
  assert.equal(e.layers.L1.id, "L1");
  assert.equal(e.layers.L2.id, "L2");
  assert.ok(e.layers.O);
  assert.ok("p_T" in e.layers);
  const p0 = JSON.stringify(e.carrier_p.quad);
  const q0 = JSON.stringify(e.content_q);
  app.dispatch("SET_CONTENT_Q", { scale: 0.33 });
  assert.equal(JSON.stringify(app.getEffective().carrier_p.quad), p0);
  assert.notEqual(JSON.stringify(app.getEffective().content_q), q0);
});

test("O p_T p_W are separate named quantities", () => {
  const app = createApp();
  app.dispatch("SET_PRINT_GALLERY_MODE", { mode: "AUTO" });
  const L = app.getEffective().layers;
  assert.ok(L.O);
  assert.ok(L.p_T);
  assert.ok(L.p_W);
  app.dispatch("PAN_OUTER_FRAME", { pan: [0.08, 0] });
  const L2 = app.getEffective().layers;
  assert.ok(Math.abs(L2.O[0] - L.O[0]) > 1e-6);
});

test("identity domain warp detJ positive; contradiction does not mutate base", () => {
  const w = identityWarp([0.2, 0.3]);
  assert.deepEqual(w, [0.2, 0.3]);
  const app = createApp();
  assert.equal(app.getEffective().domain_warp.mode, "IDENTITY");
  assert.ok(app.getEffective().domain_warp.detJ > 0);
  const phone = JSON.stringify(app.getRequested().phone);
  const c = evaluateContradiction({ contradiction: { enabled: true, ops: [{ kind: "DECLARE" }] } });
  assert.equal(c.base_untouched, true);
  assert.equal(JSON.stringify(app.getRequested().phone), phone);
});

test("panel-space identity is modular and source-exact", () => {
  const app = createApp();
  const p = app.getEffective().panel_space;
  assert.equal(p.identity, true);
  assert.equal(p.source_exact, true);
  assert.equal(p.modular, true);
});

test("orchestrator is the Part II solve entry", () => {
  const r = solve(defaultRequestedState());
  assert.ok(r.effective.layers.L0);
  assert.ok(r.effective.carrier_p);
});
