import test from "node:test";
import assert from "node:assert/strict";
import { PHASES } from "../src/ui/state/phase_state.js";
import { hitScreenCorner } from "../src/ui/manipulators/screen_quad.js";
import { createApp } from "../src/app/facade.js";

test("Phase 6 · production navigation is DECLARE SOLVE STAGE",()=>assert.deepEqual(PHASES,["DECLARE","SOLVE","STAGE"]));

test("Phase 6 · capture dragger targets all four P corners",()=>{const q=[[.2,.2],[.8,.2],[.8,.8],[.2,.8]];for(let i=0;i<4;i++)assert.equal(hitScreenCorner(q,q[i],.02),i);assert.equal(hitScreenCorner(q,[.5,.5],.02),-1);});

test("ACC-PQ-01 · off-axis rigid apparatus passes all six P gates",()=>{
  const app=createApp();
  // This gate tests projective P, not the independent WORLD-mirror declaration.
  // Put the mirror under the apparatus relation so phone/mirror rotate rigidly together.
  app.dispatch("SET_MIRROR_FRAME_AUTHORITY",{authority:"APPARATUS"});
  app.dispatch("ROTATE_PHONE",{yaw:.08,pitch:.04,roll:.10});
  const p=app.getEffective().carrier_p;
  assert.equal(p.quad.length,4);
  assert.ok(p.quad.every((x)=>x&&Number.isFinite(x[0])));
  assert.equal(p.gates_ok,true,JSON.stringify(p.gate_reasons));
  for(const id of ["area","angle","footprint","conditioning","occlusion","bezel"]){
    assert.equal(p.gates[id].ok,true,`${id}: ${JSON.stringify(p.gates[id])}`);
  }
  assert.equal(p.valid,true);
});

test("Phase 6 · Q authoring does not mutate P",()=>{const app=createApp();const p0=structuredClone(app.getEffective().carrier_p.quad);app.dispatch("SET_CONTENT_Q",{offset:[.1,-.1],scale:1.2});assert.deepEqual(app.getEffective().carrier_p.quad,p0);assert.deepEqual(app.getRequested().content_q.offset,[.1,-.1]);});
