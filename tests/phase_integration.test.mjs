import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";

test("Phases 5–7 · composition remains downstream of physical feasibility",()=>{const e=createApp().getEffective();const boundary=e.feasible?.distance_to_boundary;assert.equal(e.feasible?.inside,true,`feasible boundary ${boundary}`);assert.equal(typeof boundary,"number");assert.ok(e.carrier_p?.valid,JSON.stringify(e.carrier_p?.reasons));assert.ok(e.composition_metrics);});
