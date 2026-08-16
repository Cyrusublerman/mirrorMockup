import test from "node:test";
import assert from "node:assert/strict";
import { PHASES } from "../src/ui/state/phase_state.js";
import { hitScreenCorner } from "../src/ui/manipulators/screen_quad.js";
import { createApp } from "../src/app/facade.js";

test("Phase 6 · production navigation is DECLARE SOLVE STAGE",()=>assert.deepEqual(PHASES,["DECLARE","SOLVE","STAGE"]));

test("Phase 6 · capture dragger targets all four P corners",()=>{const q=[[.2,.2],[.8,.2],[.8,.8],[.2,.8]];for(let i=0;i<4;i++)assert.equal(hitScreenCorner(q,q[i],.02),i);assert.equal(hitScreenCorner(q,[.5,.5],.02),-1);});

test("Phase 6 · P survives an off-axis rigid rotation through all six gates",()=>{const app=createApp();app.dispatch("ROTATE_PHONE",{yaw:.08,pitch:.04,roll:.32});const p=app.getEffective().carrier_p;assert.equal(p.quad.length,4);assert.ok(p.quad.every((x)=>x&&Number.isFinite(x[0])));assert.equal(p.gates_ok,true,JSON.stringify(p.gate_reasons));});

test("Phase 6 · Q authoring does not mutate P",()=>{const app=createApp();const p0=structuredClone(app.getEffective().carrier_p.quad);app.dispatch("SET_CONTENT_Q",{offset:[.1,-.1],scale:1.2});assert.deepEqual(app.getEffective().carrier_p.quad,p0);assert.deepEqual(app.getRequested().content_q.offset,[.1,-.1]);});
