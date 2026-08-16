import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createApp } from "../src/app/facade.js";
import { PRODUCTION_PHASES } from "../src/ui/hud/top_mode_strip.js";
import { CATALOGUE, drawOverlays } from "../src/ui/overlays/composition_overlay_stack.js";
import { BUILD } from "../src/app/build_identity.js";
import { projectForHud } from "../src/ui/adapters/selector_projection_adapter.js";
import { createDispatchAdapter } from "../src/ui/adapters/action_dispatch_adapter.js";

test("production phases are DECLARE SOLVE STAGE",()=>{assert.deepEqual(PRODUCTION_PHASES,["DECLARE","SOLVE","STAGE"]);assert.equal(PRODUCTION_PHASES.includes("INSPECT"),false);assert.equal(PRODUCTION_PHASES.includes("RECURSION"),false);});

test("overlay catalogue is the production set",()=>{for(const id of["GRID","BBOX","CENTROID","MEASURE","PERSPECTIVE","CORRESPONDENCE","VISIBILITY","APPARATUS","RECURSION","DISTORTION"])assert.ok(CATALOGUE.includes(id));});

test("PAN_OUTER_FRAME does not mutate principal point",()=>{const app=createApp(),cx=app.getEffective().camera.cx,cy=app.getEffective().camera.cy;app.dispatch("PAN_OUTER_FRAME",{pan:[.2,-.15]});assert.equal(app.getEffective().camera.cx,cx);assert.equal(app.getEffective().camera.cy,cy);assert.deepEqual(app.getEffective().camera.crop_pan,[.2,-.15]);});

test("one continuous preview drag is one undo",()=>{const app=createApp(),d0=app.getRequested().apparatus.mirror_distance_request_m,d=createDispatchAdapter(app);d.startGesture("Set d_M");d.preview("SET_MIRROR_DISTANCE",{d_M:1.33});d.preview("SET_MIRROR_DISTANCE",{d_M:1.44});d.endGesture();assert.equal(app.lastHistoryLabel(),"Set d_M");assert.equal(app.getRequested().apparatus.mirror_distance_request_m,1.44);app.dispatch("UNDO");assert.equal(app.getRequested().apparatus.mirror_distance_request_m,d0);});

test("AUTO refuses when P is invalid",()=>{const app=createApp();app.dispatch("SET_MIRROR_DISTANCE_AUTOSOLVE",{on:false});app.dispatch("SET_MIRROR_DISTANCE",{d_M:.05});app.dispatch("SET_PRINT_GALLERY_MODE",{mode:"AUTO"});const rec=app.getEffective().recursion;if(app.getEffective().carrier_p.valid)assert.equal(rec.refused,false);else{assert.equal(rec.refused,true);assert.equal(rec.mode,"OFF");assert.ok((rec.reasons||[]).length>0);}});

test("build identity is stamped on export sidecar",()=>{const app=createApp(),last=app.dispatch("EXPORT_IMAGE",{width:32,height:32});assert.equal(last.export.sidecar.build.app,BUILD.app);assert.ok(last.export.staging);assert.ok(last.export.overlay);});

test("HUD projection exposes P/Q and build stamp",()=>{const p=projectForHud(createApp());assert.ok("portal" in p);assert.equal(p.build.APP,BUILD.app);assert.equal(p.build.UI,BUILD.ui);assert.equal(p.build.CORE,BUILD.core);});

test("composition targets expose class, tolerance and residuals",()=>{const p=projectForHud(createApp());assert.ok(p.targets.length>0);const phone=p.targets.find((t)=>t.id==="phone");assert.ok(phone);assert.equal(phone.class,"soft");assert.equal(typeof phone.tolerance,"number");assert.ok(phone.requested);});

test("BBOX overlay uses landmark boxes not a fake frame",()=>{const app=createApp(),proj=projectForHud(app),head=proj.targets.find((t)=>t.id==="direct_head");assert.ok(head?.bbox);const calls=[];const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},closePath(){},clearRect(){},fillText(){},strokeRect(...a){calls.push(a);},set strokeStyle(_v){},set fillStyle(_v){},set font(_v){},set lineWidth(_v){}};drawOverlays(ctx,100,100,{overlays:{BBOX:true}},proj);assert.ok(calls.length>0);const[x,y,bw,bh]=calls[0];assert.ok(Math.abs(x-head.bbox.tl[0]*100)<1e-9);assert.ok(Math.abs(y-head.bbox.tl[1]*100)<1e-9);assert.ok(bw>1&&bh>1);});

test("snapshot save/load round-trips; missing id does not wipe state",()=>{const app=createApp(),t0=app.getRequested().phone.transform_request.translation.slice();app.dispatch("MOVE_PHONE",{translation:[.2,.5,1.4]});app.dispatch("SAVE_SNAPSHOT",{id:"A"});app.dispatch("MOVE_PHONE",{translation:[.3,.5,1.4]});app.dispatch("LOAD_SNAPSHOT",{id:"A"});assert.deepEqual(app.getRequested().phone.transform_request.translation,[.2,.5,1.4]);const last=app.dispatch("LOAD_SNAPSHOT",{id:"missing"});assert.equal(last.error,"no snapshot");assert.deepEqual(app.getRequested().phone.transform_request.translation,[.2,.5,1.4]);assert.ok(t0);});

test("no ROTATE_MIRROR in production UI modules",()=>{for(const f of["src/ui/app_shell.js","src/ui/hud/context_hud.js"]){const text=readFileSync(new URL("../"+f,import.meta.url),"utf8");assert.equal(text.includes("ROTATE_MIRROR"),false);}});

test("remote launcher pins SHA and does not exec arbitrary repo",()=>{const html=readFileSync(new URL("../remote.html",import.meta.url),"utf8");assert.match(html,/PINNED/);assert.match(html,/repo host not allowed/);assert.equal(html.includes("innerHTML"),false);assert.match(html,/textContent/);assert.doesNotMatch(html,/@main/);assert.doesNotMatch(html,/<base/);assert.match(html,/src\/app\/boot\.js/);assert.match(html,/cdn\.jsdelivr\.net\/gh\//);assert.match(html,/type="importmap"/);});

test("app shell is the v5 three-phase instrument",()=>{const js=readFileSync(new URL("../src/ui/app_shell.js",import.meta.url),"utf8");assert.match(js,/mp-app/);assert.match(js,/mp-output-pane/);assert.match(js,/mp-stage/);assert.match(js,/mp-hud/);const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");assert.match(html,/src\/app\/boot\.js/);const strip=readFileSync(new URL("../src/ui/hud/top_mode_strip.js",import.meta.url),"utf8");assert.match(strip,/PHASES/);assert.doesNotMatch(strip,/POSE.*SCENE.*RECURSION/s);assert.doesNotMatch(strip,/EXPORT/);});

test("P0 photograph is not in public fixtures",()=>{for(const n of["fixtures/P0/base_female_rigged.glb","fixtures/P0/landmarks.json"])readFileSync(new URL("../"+n,import.meta.url));const html=readFileSync(new URL("../src/ui/app_shell.js",import.meta.url),"utf8");assert.doesNotMatch(html,/P0\.(jpg|jpeg|png|webp)/);});
