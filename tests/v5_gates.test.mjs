import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app/facade.js";
import { FeasibleSet, HEAD_RADIUS_M, E_FLOOR_M } from "../src/domains/apparatus/feasible_set.js";
import { ApertureBand } from "../src/domains/visibility/aperture_band.js";
import { OcclusionIntent, INTENT } from "../src/domains/visibility/occlusion_intent.js";
import { ScreenQuad, SCREEN_GATES } from "../src/domains/carrier_p/screen_quad.js";
import { PhoneScale } from "../src/domains/phone/scale_propagate.js";
import { PHASES, OUTPUT_MODES } from "../src/ui/state/phase_state.js";
import { OPEN_DISAGREEMENTS } from "../fixtures/decisions.js";

test("ACC-FEA-01 feasible set exposes the named v5 boundaries",()=>{const row=new FeasibleSet().evaluate({face:[0,1.2,1.55],camera:[.14,1.54,1.665],mirrorCentre:[0,0,1.2],mirrorNormal:[0,1,0],shoulder:[.18,1.2,1.45],r:HEAD_RADIUS_M});assert.equal(typeof row.inside,"boolean");assert.equal(typeof row.distance_to_boundary,"number");assert.deepEqual(row.boundaries.map((b)=>b.id),["elbow_in","eclipse","shoulder_abduction","cross_body","reach"]);assert.ok(row.eMin>=E_FLOOR_M);});

test("§5 aperture band uses the closed form in both directions",()=>{const band=new ApertureBand().evaluate({camera:{world:{translation:[0,1.54,1.665]}},face:[0,1.2,1.55],mirror:{centre:[0,0,1.2],basis:{n:[0,1,0]},height_m:1.1},stature:1.7});const z=.9;assert.ok(Math.abs(band.z_p_fn(band.z_r_fn(z))-z)<1e-10);assert.ok(band.visible_band[0]>=0&&band.visible_band[1]<=1.7);});

test("§6 occlusion semantics include named allowed occluders",()=>{const oc=new OcclusionIntent({reflected_head:{state:INTENT.REQUIRED,min:.5,allowed_occluders:["direct_hair"]}});const ok=oc.evaluate({reflected_head:{fraction:.7,occluders:["direct_hair"]}});assert.equal(ok.ok,true);const bad=oc.evaluate({reflected_head:{fraction:.7,occluders:["direct_face"]}});assert.equal(bad.ok,false);});

test("ACC-PQ-01 screen quad carries exactly six authoritative gates",()=>{const e=createApp().getEffective(),sq=new ScreenQuad(),p=sq.evaluate(e.phone,e.camera,e.mirror);assert.deepEqual(Object.keys(p.gates).sort(),[...SCREEN_GATES].sort());assert.equal(p.valid,p.gates_ok&&!(p.reasons||[]).some((r)=>!String(r).startsWith("gate_")&&String(r)!==""));});

test("§8 phone-scale equation round-trips",()=>{const s=new PhoneScale(),hfov=70*Math.PI/180,c=s.distanceForFraction(.05,.071,hfov),f=s.fractionForDistance(c,.071,hfov);assert.ok(Math.abs(f-.05)<1e-9);});

test("§13 phase and output enums are literal v5",()=>{assert.deepEqual(PHASES,["DECLARE","SOLVE","STAGE"]);for(const id of ["FINAL_CAMERA","COMPOSITION","MASK","RECURSION","STAGING","FULL_SENSOR"])assert.ok(OUTPUT_MODES.includes(id));});

test("§16 is explicitly unresolved, not silently decided",()=>{for(const [id,row]of Object.entries(OPEN_DISAGREEMENTS)){assert.equal(row.resolved,false,id);assert.ok(row.settle,id);}});
