import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { FeasibleSet, HEAD_RADIUS_M, E_FLOOR_M } from "../src/domains/apparatus/feasible_set.js";
import { ApertureBand } from "../src/domains/visibility/aperture_band.js";
import { OcclusionIntent, INTENT } from "../src/domains/visibility/occlusion_intent.js";
import { ScreenQuad, SCREEN_GATES } from "../src/domains/carrier_p/screen_quad.js";
import { MaskCompare } from "../src/domains/composition/mask_compare.js";
import { StagingPrescription } from "../src/domains/export/staging_prescription.js";
import { PANELS_AI } from "../fixtures/reference/panels_ai.js";
import { t } from "../fixtures/tolerances.js";
import { createDispatchAdapter } from "../src/ui/adapters/action_dispatch_adapter.js";
import { ReflectionRay, RAY_STATE } from "../src/domains/visibility/reflection_ray.js";
import { PhoneScale } from "../src/domains/phone/scale_propagate.js";
import { PHASES, OUTPUT_MODES } from "../src/ui/state/phase_state.js";
import { DEC } from "../fixtures/decisions.js";

test("ACC-FEA-01 feasible set reports inside and boundary distance", () => {
  const set = new FeasibleSet();
  const n = [0, 1, 0];
  const M = [0, 0, 1.2];
  const face = [0, 1.2, 1.55];
  const camera = [0.14, 1.54, 1.665];
  const shoulder = [0.18, 1.2, 1.45];
  const row = set.evaluate({ face, camera, mirrorCentre: M, mirrorNormal: n, shoulder });
  assert.equal(typeof row.inside, "boolean");
  assert.equal(typeof row.distance_to_boundary, "number");
  assert.ok(row.a > 0);
  assert.ok(row.e >= 0);
  assert.ok(row.R > 1);
  const eclipsed = set.evaluate({
    face,
    camera: [0, 1.54, 1.665],
    mirrorCentre: M,
    mirrorNormal: n,
    shoulder,
    r: HEAD_RADIUS_M,
  });
  assert.equal(eclipsed.inside, false);
  assert.ok(eclipsed.reasons.includes("direct_head_eclipse") || eclipsed.reasons.includes("e_floor"));
  assert.ok(eclipsed.e < E_FLOOR_M + 0.02);
  const dots = set.referenceDots();
  assert.equal(dots.length, 9);
  assert.deepEqual(dots.map((d) => d.id).sort(), Object.keys(PANELS_AI).sort());
});

test("ACC-REF-02 aperture band uses closed-form z_r", () => {
  const band = new ApertureBand().evaluate({
    camera: { world: { translation: [0, 1.54, 1.665] } },
    face: [0, 1.2, 1.55],
    mirror: { centre: [0, 0, 1.2], basis: { n: [0, 1, 0] }, height_m: 1.1 },
    stature: 1.7,
  });
  const p = band.p;
  const c = band.c;
  const z_c = 1.665;
  const z_p = 1.7;
  const expect = (p * z_c + c * z_p) / (c + p);
  assert.ok(Math.abs(band.z_r_fn(z_p) - expect) < 1e-12);
  assert.ok(band.parts.head);
  assert.ok(band.parts.feet);
});

test("D24 occlusion intent violates only REQUIRED under", () => {
  const oc = new OcclusionIntent();
  const ok = oc.evaluate({
    reflected_head: 1,
    reflected_torso: 0,
    reflected_legs: 1,
    reflected_phone: 1,
    direct_face: 0,
  });
  assert.equal(ok.ok, true);
  const bad = oc.evaluate({
    reflected_head: 0,
    reflected_torso: 0,
    reflected_legs: 1,
    reflected_phone: 1,
    direct_face: 0,
  });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.violations, ["reflected_head"]);
  assert.equal(INTENT.REQUIRED, "REQUIRED");
});

test("ACC-PQ-01 screen quad exposes six gates and survives yaw", () => {
  const app = createApp();
  const e0 = app.getEffective();
  const sq = new ScreenQuad();
  const g0 = sq.evaluate(e0.phone, e0.camera, e0.mirror);
  assert.deepEqual(Object.keys(g0.gates).sort(), [...SCREEN_GATES].sort());
  app.dispatch("ROTATE_PHONE", { yaw: 0.35, pitch: 0, roll: 0.32 });
  const e1 = app.getEffective();
  const g1 = sq.evaluate(e1.phone, e1.camera, e1.mirror);
  assert.equal(g1.quad.length, 4);
  assert.ok(g1.quad.every((p) => p && Number.isFinite(p[0])));
  assert.ok("gates_ok" in g1);
});

test("ACC-MSK-01 per-part IoU against A–I occupancy", () => {
  const cmp = new MaskCompare();
  const pred = [1, 1, 2, 0, 1, 2, 2, 0];
  const ref = [1, 1, 1, 0, 1, 2, 0, 0];
  const parts = cmp.perPart(pred, ref, [1, 2]);
  assert.ok(parts[1] >= t("T-MSK-IOU"));
  const row = cmp.occupancyResidual("I", { mirror: 0.228, direct_body: 0.502, reflected_body: 0.043 });
  assert.equal(row.panel, "I");
  assert.ok(row.weighted > 0.99);
  assert.equal(Object.keys(cmp.panels()).length, 9);
});

test("ACC-EPI-01 staging refuses hollow distances", () => {
  const app = createApp();
  const last = app.dispatch("EXPORT_STAGING_PRESCRIPTION", { width: 32, height: 32 });
  assert.equal(last.export.staging.refused, true);
  assert.ok((last.export.staging.hollow || []).length > 0);
  assert.equal(last.error, "staging refused: hollow distances");
  const card = new StagingPrescription().build(
    { camera: { epistemic_status: "MEASURED" }, body: { definition: { epistemic_status: "MEASURED", stature: 1.7 } }, phone: { width_epistemic: "MEASURED", body_dimensions_m: { width: 0.075 } } },
    { feasible: { m: 1.2, u: 0.34, e: 0.14 }, apparatus: { d_M: 1.2 }, camera: { world: { translation: [0, 0, 1.6] } } },
  );
  assert.equal(card.refused, false);
});

test("ACC-FEA-01 boot state lies inside the feasible region", () => {
  const app = createApp();
  const row = app.getEffective().feasible;
  assert.equal(row.inside, true);
  assert.equal(typeof row.distance_to_boundary, "number");
  assert.ok(row.e >= E_FLOOR_M);
  assert.ok(row.clearance >= 0);
  assert.equal(DEC["DEC-OP"].value, "ANALYSIS_STATION");
});

test("ACC-REF-03 reflection ray names four failure states", () => {
  const ray = new ReflectionRay();
  const basis = { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] };
  const mirror = { centre: [0, 2, 1.2], basis, width_m: 0.6, height_m: 0.8 };
  const miss = ray.trace([0, 0, 1.2], [0, 0.2, 1.2], { ...mirror, basis: { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] } });
  assert.ok(Object.values(RAY_STATE).includes(miss.state));
  const out = ray.trace([3, 0.5, 1.2], [0, 0.2, 1.2], mirror);
  assert.equal(out.state, RAY_STATE.OUTSIDE_APERTURE);
});

test("D18 phone scale maps f to camera distance", () => {
  const s = new PhoneScale();
  const hfov = (70 * Math.PI) / 180;
  const c = s.distanceForFraction(0.05, 0.071, hfov);
  const f = s.fractionForDistance(c, 0.071, hfov);
  assert.ok(Math.abs(f - 0.05) < 1e-9);
});

test("§13 phases and output modes", () => {
  assert.deepEqual(PHASES, ["DECLARE", "SOLVE", "STAGE"]);
  assert.ok(OUTPUT_MODES.includes("MASK"));
  assert.ok(OUTPUT_MODES.includes("FINAL_CAMERA"));
});

test("ACC-TXN-01 edit writes one named driver", () => {
  const app = createApp();
  const d = createDispatchAdapter(app);
  d.startGesture("Changed mirror distance");
  d.preview("SET_MIRROR_DISTANCE", { d_M: 1.4 });
  d.endGesture();
  const le = app.getEffective().last_edit;
  assert.equal(le.driver, "mirror");
  assert.equal(le.action, "SET_MIRROR_DISTANCE");
  assert.ok(Array.isArray(le.preserve));
  assert.ok(Array.isArray(le.allowed_to_move));
  app.dispatch("UNDO");
});
