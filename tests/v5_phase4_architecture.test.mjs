import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PHASES, INPUT_MODES, OUTPUT_MODES } from "../src/ui/state/phase_state.js";

const read=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");

test("Phase 4 · literal workflow phases and pane modes",()=>{
  assert.deepEqual(PHASES,["DECLARE","SOLVE","STAGE"]);
  assert.deepEqual(INPUT_MODES,["VIEWPORT","NUMBERS","PLAN","ELEVATION","FEASIBLE"]);
  assert.deepEqual(OUTPUT_MODES,["FINAL_CAMERA","COMPOSITION","MASK","RECURSION","STAGING","FULL_SENSOR"]);
});

test("Phase 4 · object-category rooms are absent from production UI architecture",()=>{
  const phase=read("../src/ui/state/phase_state.js"),shell=read("../src/ui/app_shell.js"),scene=read("../src/render/scene_3d.js");
  for(const src of [phase,shell,scene]){
    assert.doesNotMatch(src,/PHASE_TO_ROOM/);
    assert.doesNotMatch(src,/setRoom\s*\(/);
    assert.doesNotMatch(src,/room\s*=\s*\{\s*id\s*:/);
  }
  assert.match(scene,/setFrameScope/);
});

test("Phase 4 · physical authoring is SOLVE-gated, not DECLARE-gated",()=>{
  const shell=read("../src/ui/app_shell.js");
  assert.match(shell,/IK_JOINTS\.includes\(hit\.id\).*workspace\.phase===\"SOLVE\"/);
  assert.match(shell,/hit\.kind===\"phone\"&&workspace\.phase===\"SOLVE\"/);
  assert.doesNotMatch(shell,/IK_JOINTS\.includes\(hit\.id\).*workspace\.phase===\"DECLARE\"/);
});

test("Phase 4 · input modes belong to input pane and selection dock stays contextual",()=>{
  const shell=read("../src/ui/app_shell.js"),hud=read("../src/ui/hud/context_hud.js");
  assert.match(shell,/stage\.append\(canvas, overlay, viewsEl, viewLab, toast, diagEl, modeEl\)/);
  assert.match(shell,/hud\.append\(contextEl, validEl\)/);
  assert.doesNotMatch(hud,/TransactionCard/);
  assert.match(hud,/output_mode===\"RECURSION\"&&\(sel\?\.kind===\"q\"\|\|sel\?\.kind===\"content_q\"\)/);
});
