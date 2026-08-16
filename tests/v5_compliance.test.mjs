import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createApp } from "../src/app/facade.js";
import { PHASES, INPUT_MODES, OUTPUT_MODES } from "../src/ui/state/phase_state.js";
import { REPRESENTATION_LAYERS, NUMERIC_FRAMES } from "../src/ui/state/workspace_state.js";
import { OPEN_DISAGREEMENTS } from "../fixtures/decisions.js";
import { SCREEN_GATES } from "../src/domains/carrier_p/screen_quad.js";
import { MASK_CODE } from "../fixtures/reference/declared_masks.js";
import { maskAcceptanceFixture, MASK_ACCEPTANCE_VERSION } from "../fixtures/reference/mask_acceptance.js";
import { MaskRender } from "../src/domains/reference/mask_extract.js";
import { MaskCompare } from "../src/domains/composition/mask_compare.js";
import { t } from "../fixtures/tolerances.js";

test("v5 §13 · phases replace object-category rooms", () => {
  assert.deepEqual(PHASES,["DECLARE","SOLVE","STAGE"]);
  assert.deepEqual(INPUT_MODES,["VIEWPORT","NUMBERS","PLAN","ELEVATION","FEASIBLE"]);
  assert.deepEqual(OUTPUT_MODES,["FINAL_CAMERA","COMPOSITION","MASK","RECURSION","STAGING","FULL_SENSOR"]);
  const strip=readFileSync(new URL("../src/ui/hud/top_mode_strip.js",import.meta.url),"utf8");
  assert.doesNotMatch(strip,/POSE|SCENE/);
  assert.match(strip,/PHASES/);
});

test("v5 §9 · representation chain is exactly Gesture → Volume → Contour", () => {
  assert.deepEqual(REPRESENTATION_LAYERS,["GESTURE","VOLUME","CONTOUR"]);
  const app=createApp(),e=app.getEffective();
  assert.equal(e.volume.layer,"VOLUME");
  assert.equal(e.volume.source_layer,"GESTURE");
  assert.equal(e.contour.layer,"CONTOUR");
  assert.equal(e.contour.source_layer,"VOLUME");
  assert.equal(e.contour.exportable,true);
  const scene=readFileSync(new URL("../src/render/scene_3d.js",import.meta.url),"utf8");
  assert.doesNotMatch(scene,/bodyMode\.kind\s*===\s*["'](?:RIGGED|SIMPLE|STICK|SILHOUETTE)["']/);
});

test("v5 §13 · numeric frames are complete and explicit",()=>{
  assert.deepEqual(NUMERIC_FRAMES,["PARENT","ANATOMICAL","HEAD","MIRROR","IMAGE","WORLD"]);
  const shell=readFileSync(new URL("../src/ui/app_shell.js",import.meta.url),"utf8");
  assert.match(shell,/Right arm · 7 DOF/);
  assert.match(shell,/Torso · three boxes/);
  assert.match(shell,/head aim/);
});

test("v5 §16 · all five disagreements remain unresolved until declared",()=>{
  assert.deepEqual(Object.keys(OPEN_DISAGREEMENTS),["DEC-OP","DEC-F","DEC-TOP","DEC-P0","DEC-R"]);
  for(const row of Object.values(OPEN_DISAGREEMENTS)){assert.equal(row.resolved,false);assert.ok(row.settle);}
  const req=createApp().getRequested();
  assert.equal(req.apparatus.operating_point_epistemic,"UNRESOLVED");
  assert.equal(req.composition.phone_scale_policy,"UNRESOLVED");
  assert.equal(req.camera.topology_epistemic,"UNRESOLVED");
  assert.equal(req.reference.p0_occupancy_convention,"UNRESOLVED");
  assert.equal(req.reference.head_silhouette_radius_m,null);
});

test("ACC-FEA-01 · every solved state is inside the declared feasible intersection",()=>{
  const app=createApp();
  for(const move of [[.12,.55,1.48],[0,.3,1.55],[.25,.8,1.4]]){
    app.dispatch("MOVE_PHONE",{translation:move});
    const f=app.getEffective().feasible;
    assert.equal(f.inside,true,JSON.stringify(f.reasons));
    assert.equal(typeof f.distance_to_boundary,"number");
    assert.ok(Array.isArray(f.boundaries)&&f.boundaries.length===5);
    assert.ok(f.a>=.25-1e-3&&f.a<=.60+1e-3);
    assert.ok(f.e>=f.eMin-1e-3&&f.e<=f.eMax+1e-3);
  }
});

test("ACC-PQ-01 · screen quad passes all six gates",()=>{
  const app=createApp(),p=app.getEffective().carrier_p;
  assert.deepEqual(Object.keys(p.gates).sort(),[...SCREEN_GATES].sort());
  assert.equal(p.gates_ok,true,JSON.stringify(p.gate_reasons));
  assert.equal(p.valid,true,JSON.stringify(p.reasons));
  for(const id of SCREEN_GATES)assert.equal(p.gates[id].ok,true,id);
});

test("v5 §10 · a four-corner drag solves a rigid phone transform, not a scalar square",()=>{
  const app=createApp(),p0=app.getEffective().carrier_p.quad[0];
  const out=app.solveScreenCorner(0,[p0[0]+.01,p0[1]-.008]);
  assert.ok(Number.isFinite(out.residual));
  assert.ok(out.residual<.01,`residual ${out.residual}`);
  assert.equal(out.translation.length,3);
  assert.ok([out.yaw,out.pitch,out.roll].every(Number.isFinite));
});

test("ACC-MSK-01 · production MaskRender passes an independent versioned per-part IoU fixture",()=>{
  const fx=maskAcceptanceFixture();
  assert.equal(fx.version,MASK_ACCEPTANCE_VERSION);
  const actual=new MaskRender().render(fx.contour,fx.camera,fx.mirror,fx.carrier_p,fx.mirror_quad,fx.width,fx.height);
  const cmp=new MaskCompare().compare(actual,fx.reference_labels);
  for(const [name,code] of Object.entries(MASK_CODE)){
    if(code===0)continue;
    assert.ok(cmp.parts[name]>=t("T-MSK-IOU"),`${name} IoU ${cmp.parts[name]} < ${t("T-MSK-IOU")}`);
  }
});

test("ACC-EPI-01 · staging export stays blocked until every printed physical scale root is solid",()=>{
  const app=createApp();
  let last=app.dispatch("EXPORT_STAGING_PRESCRIPTION",{width:32,height:32});
  assert.equal(last.export.staging.refused,true);
  assert.match(last.error,/staging refused/);

  app.dispatch("SET_PHONE_WIDTH_MEASUREMENT",{width_m:.071});
  last=app.dispatch("EXPORT_STAGING_PRESCRIPTION",{width:32,height:32});
  assert.equal(last.export.staging.refused,true,"phone width alone cannot make camera/body distances solid");
  assert.ok(last.export.staging.hollow.includes("camera_height_m"));
  assert.ok(last.export.staging.hollow.includes("stature_m"));

  app.dispatch("SET_CAMERA_CALIBRATION",{id:"ACC-EPI-01-CAL",epistemic_status:"CALIBRATED"});
  app.dispatch("SET_BODY_PARAMETER",{epistemic_status:"MEASURED"});
  last=app.dispatch("EXPORT_STAGING_PRESCRIPTION",{width:32,height:32});
  assert.equal(last.export.staging.refused,false,JSON.stringify(last.export.staging.hollow));
  assert.equal(last.error,undefined);
});

test("v5 §8 · f cannot silently become solved",()=>{
  const app=createApp();
  const bad=app.dispatch("SET_PHONE_SCALE",{f:.08});
  assert.match(bad.error,/policy unresolved/);
  app.dispatch("SET_PHONE_SCALE_POLICY",{policy:"SOLVED"});
  const ok=app.dispatch("SET_PHONE_SCALE",{f:.08});
  assert.equal(ok.error,undefined);
  assert.equal(app.getRequested().composition.phone_scale_request,.08);
});

test("v5 §12 · requested state remains artist intent while effective state may compensate",()=>{
  const app=createApp();
  app.dispatch("SET_MIRROR_DISTANCE",{d_M:1.37},{label:"mirror request"});
  assert.equal(app.getRequested().apparatus.mirror_distance_request_m,1.37);
  assert.ok(Number.isFinite(app.getEffective().apparatus.d_M));
  assert.equal(app.getEffective().last_edit.driver,"mirror");
});

test("v5 §5 · aperture diagnostics expose body-space visible band and camera-height sensitivity",()=>{
  const b=createApp().getEffective().aperture_band;
  assert.equal(b.visible_band.length,2);
  assert.ok(b.visible_band[0]>=0&&b.visible_band[1]<=1.727+1e-6);
  assert.ok(b.cut>=0);
  assert.ok(b.sill_sensitivity>0&&b.sill_sensitivity<1);
});
