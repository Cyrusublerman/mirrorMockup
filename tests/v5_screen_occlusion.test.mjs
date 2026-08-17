import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { ScreenQuad } from "../src/domains/carrier_p/screen_quad.js";
import { screenOcclusionFraction } from "../src/domains/hand_grip/grip.js";

const identity = { translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] };

test("v5 entity 7 · finger polygon contributes physical screen occlusion fraction", () => {
  const f = screenOcclusionFraction([[[0, 0], [0.25, 0], [0.25, 1], [0, 1]]]);
  assert.ok(Math.abs(f - 0.25) < 1e-12, String(f));
});

test("ACC-PQ-01 · declared finger occlusion makes the P occlusion gate fail", () => {
  const app = createApp();
  app.dispatch("SET_MIRROR_FRAME_AUTHORITY", { authority: "APPARATUS" });
  app.dispatch("SET_GRIP_RELATION", { screen_occluder_polygons_uv: [[[0, 0], [0.2, 0], [0.2, 1], [0, 1]]] });
  const gate = app.getEffective().carrier_p.gates.occlusion;
  assert.equal(gate.ok, false, JSON.stringify(gate));
  assert.ok(gate.finger_fraction >= 0.199999, JSON.stringify(gate));
  assert.ok(app.getEffective().carrier_p.gate_reasons.includes("occlusion"));
});

test("ACC-PQ-01 · body geometry on a reflected screen ray makes the P occlusion gate fail", () => {
  const q = new ScreenQuad();
  const phone = {
    screen_corners_world: [[-0.1, 1, -0.1], [0.1, 1, -0.1], [0.1, 1, 0.1], [-0.1, 1, 0.1]],
  };
  const cam = { world: { translation: [0, 2, 0] } };
  const mirror = {
    centre: [0, 0, 0],
    basis: { u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0] },
    width_m: 10,
    height_m: 10,
  };
  const blocker = {
    mesh: { positions: [[-2, 1.5, -2], [2, 1.5, -2], [0, 1.5, 2]], triangles: [[0, 1, 2]] },
    world: identity,
  };
  const gate = q.occlusionGate({ reasons: [] }, phone, cam, mirror, { occluders: [blocker] });
  assert.equal(gate.ok, false, JSON.stringify(gate));
  assert.ok(gate.ray_fraction > 0, JSON.stringify(gate));
  assert.ok(gate.ray_states.some((s) => s === "OCCLUDED_CAMERA_TO_MIRROR"), JSON.stringify(gate));
});
