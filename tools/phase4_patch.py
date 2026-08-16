from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text()
    c = s.count(old)
    if c != 1:
        raise SystemExit(f"{path}: expected one occurrence, got {c}: {old[:100]!r}")
    p.write_text(s.replace(old, new, 1))


# app_shell: phases are workflow authority, never hidden POSE/SCENE rooms.
replace_once(
    "src/ui/app_shell.js",
    'import { PhaseState, PHASE_TO_ROOM } from "./state/phase_state.js";',
    'import { PhaseState } from "./state/phase_state.js";',
)

replace_once(
    "src/ui/app_shell.js",
    '  const diagEl = el("div");\n  stage.append(canvas, overlay, viewsEl, viewLab, toast, diagEl);\n\n  const hud = el("section", "mp-hud"); hud.setAttribute("aria-label", "Selection dock");\n  const contextEl = el("div", "mp-context");\n  const validEl = el("div", "mp-valid-wrap");\n  const modeEl = el("div", "mp-input-wrap");\n  hud.append(contextEl, modeEl, validEl);',
    '  const diagEl = el("div");\n  const modeEl = el("div", "mp-input-wrap");\n  stage.append(canvas, overlay, viewsEl, viewLab, toast, diagEl, modeEl);\n\n  const hud = el("section", "mp-hud"); hud.setAttribute("aria-label", "Selection dock");\n  const contextEl = el("div", "mp-context");\n  const validEl = el("div", "mp-valid-wrap");\n  hud.append(contextEl, validEl);',
)

replace_once(
    "src/ui/app_shell.js",
    '  scene3d.setEditorView(viewState.editor_view);\n  scene3d.setRoom(PHASE_TO_ROOM[workspace.phase]);',
    '  scene3d.setEditorView(viewState.editor_view);\n  scene3d.setFrameScope("BODY");',
)

replace_once(
    "src/ui/app_shell.js",
    '      select(sel){workspace.selected=sel;app.dispatch("SET_SELECTION",{selection:sel.id||sel.kind},{preview:true});if(persistentNumbers)workspace.precision=true;paintHud();},',
    '      select(sel){workspace.selected=sel;app.dispatch("SET_SELECTION",{selection:sel.id||sel.kind},{preview:true});scene3d.setFrameScope(["joint","body","arm7","torso"].includes(sel.kind)?"BODY":"APPARATUS");if(persistentNumbers)workspace.precision=true;paintHud();},',
)

replace_once(
    "src/ui/app_shell.js",
    '    mountTopModeStrip(strip,workspace,(phase)=>{workspace.phase=phase;phaseState.setPhase(phase);scene3d.setRoom(PHASE_TO_ROOM[phase]);app.dispatch("SET_PHASE",{phase},{preview:true});paintAll();});',
    '    mountTopModeStrip(strip,workspace,(phase)=>{workspace.phase=phase;phaseState.setPhase(phase);app.dispatch("SET_PHASE",{phase},{preview:true});paintAll();});',
)

replace_once(
    "src/ui/app_shell.js",
    '    inputModes.mount(modeEl,workspace.input_mode,(id)=>{workspace.input_mode=id;phaseState.setInput(id);app.dispatch("SET_INPUT_MODE",{mode:id},{preview:true});if(id==="NUMBERS")workspace.precision=true;if(id==="PLAN"){viewState.setEditorView("TOP");workspace.editor_view="TOP";scene3d.setEditorView("TOP");}if(id==="ELEVATION"){viewState.setEditorView("LEFT");workspace.editor_view="LEFT";scene3d.setEditorView("LEFT");}paintAll();});',
    '    inputModes.mount(modeEl,workspace.input_mode,(id)=>{workspace.input_mode=id;phaseState.setInput(id);app.dispatch("SET_INPUT_MODE",{mode:id},{preview:true});if(id==="NUMBERS")workspace.precision=true;if(id==="VIEWPORT")scene3d.setFrameScope(["joint","body","arm7","torso"].includes(workspace.selected?.kind)?"BODY":"APPARATUS");if(id==="PLAN"){scene3d.setFrameScope("APPARATUS");viewState.setEditorView("TOP");workspace.editor_view="TOP";scene3d.setEditorView("TOP");}if(id==="ELEVATION"){scene3d.setFrameScope("APPARATUS");viewState.setEditorView("LEFT");workspace.editor_view="LEFT";scene3d.setEditorView("LEFT");}if(id==="FEASIBLE")scene3d.setFrameScope("APPARATUS");paintAll();});',
)

# Authoring belongs to SOLVE. DECLARE establishes evidence/assumptions; STAGE is prescription.
for old, new in [
    ('hit.kind==="joint"&&IK_JOINTS.includes(hit.id)&&workspace.phase==="DECLARE"', 'hit.kind==="joint"&&IK_JOINTS.includes(hit.id)&&workspace.phase==="SOLVE"'),
    ('hit.kind==="joint"&&workspace.phase==="DECLARE"', 'hit.kind==="joint"&&workspace.phase==="SOLVE"'),
    ('hit.kind==="phone"&&workspace.phase==="DECLARE"', 'hit.kind==="phone"&&workspace.phase==="SOLVE"'),
    ('viewState.main_pane==="CAPTURE"&&workspace.phase==="DECLARE"', 'viewState.main_pane==="CAPTURE"&&workspace.phase==="SOLVE"'),
]:
    replace_once("src/ui/app_shell.js", old, new)

replace_once(
    "src/ui/app_shell.js",
    '      const hit=hitFromEvent(scene3d,ev);if(hit){workspace.selected={kind:hit.kind,id:hit.id,label:labelForHit(hit),axis:workspace.axis};app.dispatch("SET_SELECTION",{selection:hit.id||hit.kind},{preview:true});beginDragFromHit(hit,app.getRequested());machine.beginSelect(p.id,p);paintHud();return;}',
    '      const hit=hitFromEvent(scene3d,ev);if(hit){workspace.selected={kind:hit.kind,id:hit.id,label:labelForHit(hit),axis:workspace.axis};app.dispatch("SET_SELECTION",{selection:hit.id||hit.kind},{preview:true});scene3d.setFrameScope(["joint","body"].includes(hit.kind)?"BODY":"APPARATUS");beginDragFromHit(hit,app.getRequested());machine.beginSelect(p.id,p);paintHud();return;}',
)

replace_once(
    "src/ui/app_shell.js",
    '    cameraEdit:()=>workspace.selected?.kind==="camera"||workspace.selected?.kind==="crop"||viewState.main_pane==="CAPTURE",',
    '    cameraEdit:()=>workspace.phase==="SOLVE"&&(workspace.selected?.kind==="camera"||workspace.selected?.kind==="crop"||viewState.main_pane==="CAPTURE"),',
)

# scene_3d: editor framing is a view concern, not a hidden room/scene state.
replace_once(
    "src/render/scene_3d.js",
    'const bodyMode={kind:"VOLUME"};const orbit={theta:.7,phi:1.15};const room={id:"POSE"};const frame={target:[0,.9,.9],radius:2.4,userScale:1};',
    'const bodyMode={kind:"VOLUME"};const orbit={theta:.7,phi:1.15};const frameScope={id:"BODY"};const frame={target:[0,.9,.9],radius:2.4,userScale:1};',
)
replace_once(
    "src/render/scene_3d.js",
    'function applyEditor(cam3,eff){const fitted=room.id==="SCENE"?framing.fitApparatus(eff):framing.fitBody(eff.skeleton?.fk);',
    'function applyEditor(cam3,eff){const fitted=frameScope.id==="APPARATUS"?framing.fitApparatus(eff):framing.fitBody(eff.skeleton?.fk);',
)
replace_once(
    "src/render/scene_3d.js",
    'setBodyMode:(kind)=>{if(!["GESTURE","VOLUME","CONTOUR"].includes(kind))throw new Error(`unknown representation ${kind}`);bodyMode.kind=kind;},setRoom:(id)=>{room.id=id;frame.userScale=1;},viewState,viewLabel,workspace:',
    'setBodyMode:(kind)=>{if(!["GESTURE","VOLUME","CONTOUR"].includes(kind))throw new Error(`unknown representation ${kind}`);bodyMode.kind=kind;},setFrameScope:(id)=>{if(!["BODY","APPARATUS"].includes(id))throw new Error(`unknown frame scope ${id}`);frameScope.id=id;frame.userScale=1;},viewState,viewLabel,workspace:',
)

# Context HUD: one selection, one relevant control family. No permanent transaction table.
Path("src/ui/hud/context_hud.js").write_text('''function chip(label,on,fn,name){const b=document.createElement("button");b.type="button";b.className="mp-chip"+(on?" is-on":"");b.textContent=label;b.setAttribute("aria-pressed",on?"true":"false");if(name)b.setAttribute("aria-label",name);if(fn)b.addEventListener("click",fn);return b;}\n\nfunction addRepresentation(row,workspace,handlers){\n  row.append(\n    chip("GESTURE",workspace.body_mode==="GESTURE",()=>handlers.setBodyMode("GESTURE"),"Gesture representation"),\n    chip("VOLUME",workspace.body_mode==="VOLUME",()=>handlers.setBodyMode("VOLUME"),"Volume representation"),\n    chip("CONTOUR",workspace.body_mode==="CONTOUR",()=>handlers.setBodyMode("CONTOUR"),"Contour representation")\n  );\n}\n\nexport function mountContextHud(el,workspace,proj,handlers){\n  el.replaceChildren();\n  const sel=workspace.selected,phase=workspace.phase;\n  const title=document.createElement("div");title.className="mp-sel";\n  title.textContent=sel?.label||(phase==="DECLARE"?"Declare evidence and apparatus assumptions":phase==="SOLVE"?"Select the body, phone, mirror or camera":"Stage the accepted solution");\n  el.appendChild(title);\n  const row=document.createElement("div");row.className="mp-row mp-param-row";\n\n  if(phase==="DECLARE"){\n    if(sel?.kind==="phone"||sel?.kind==="camera"){\n      const topo=proj.requested?.camera?.topology_request,declared=proj.requested?.camera?.topology_epistemic==="DECLARED",policy=proj.requested?.composition?.phone_scale_policy||"UNRESOLVED";\n      row.append(\n        chip("FRONT CAMERA",topo==="FRONT_CAMERA_SELFIE"&&declared,()=>handlers.setTopology("FRONT_CAMERA_SELFIE"),"Declare front-camera selfie topology"),\n        chip("CAMERA BETWEEN",topo==="CAMERA_BETWEEN"&&declared,()=>handlers.setTopology("CAMERA_BETWEEN"),"Declare camera-between topology"),\n        chip("f UNRESOLVED",policy==="UNRESOLVED",()=>handlers.setPhoneScalePolicy("UNRESOLVED"),"Phone scale unresolved"),\n        chip("f SOLVED",policy==="SOLVED",()=>handlers.setPhoneScalePolicy("SOLVED"),"Phone scale solved"),\n        chip("f INDEPENDENT",policy==="INDEPENDENT",()=>handlers.setPhoneScalePolicy("INDEPENDENT"),"Phone scale independent")\n      );\n    }else if(sel?.kind==="body"||sel?.kind==="joint"||sel?.kind==="torso"||sel?.kind==="arm7"){\n      const rr=proj.requested?.reference?.head_silhouette_radius_m;\n      addRepresentation(row,workspace,handlers);\n      row.append(\n        chip("HEAD r .115",Math.abs((rr||0)-.115)<1e-9,()=>handlers.setHeadRadius(.115),"Declare hair-included head radius"),\n        chip("HEAD r .105",Math.abs((rr||0)-.105)<1e-9,()=>handlers.setHeadRadius(.105),"Declare hair-excluded head radius")\n      );\n    }\n  }else if(phase==="SOLVE"){\n    if(sel?.kind==="joint"&&!["wrist_R","wrist_L","head","ankle_L","ankle_R"].includes(sel.id)){\n      for(const a of["BEND","TILT","ROTATE"])row.appendChild(chip(a,workspace.axis===a,()=>handlers.setAxis(a),a));\n    }else if(sel?.kind==="phone"){\n      row.append(\n        chip("PHONE DRIVES",workspace.drive_mode==="PHONE_DRIVES_HAND",()=>handlers.setDrive("PHONE_DRIVES_HAND"),"Phone drives hand"),\n        chip("HAND DRIVES",workspace.drive_mode==="HAND_DRIVES_PHONE",()=>handlers.setDrive("HAND_DRIVES_PHONE"),"Hand drives phone"),\n        chip("LOCK GRIP",workspace.drive_mode==="LOCK_GRIP",()=>handlers.setDrive("LOCK_GRIP"),"Lock grip")\n      );\n    }else if(sel?.kind==="body") addRepresentation(row,workspace,handlers);\n    else if(sel?.kind==="arm7") row.appendChild(chip("RIGHT ARM · 7",true,()=>handlers.openNumbers?.(),"Right arm numbers"));\n    else if(sel?.kind==="torso") row.appendChild(chip("TORSO · 3 BOXES",true,()=>handlers.openNumbers?.(),"Torso numbers"));\n    else if(sel?.kind==="mirror") row.append(\n      chip("DISTANCE",sel.id==="d_M",()=>handlers.select({kind:"mirror",id:"d_M",label:"Mirror distance"}),"Mirror distance"),\n      chip("WINDOW",sel.id==="window",()=>handlers.select({kind:"mirror",id:"window",label:"Mirror window pan"}),"Mirror window pan")\n    );\n    else if(sel?.kind==="apparatus") row.appendChild(chip("APPARATUS PAN",true,()=>{},"Apparatus pan"));\n    else if(sel?.kind==="crop"||sel?.kind==="camera") row.appendChild(chip("CROP",sel?.kind==="crop",()=>handlers.select({kind:"crop",id:"crop",label:"Crop pan"}),"Crop pan"));\n    else if(sel?.kind==="reflected") row.appendChild(chip("REFLECTED",true,()=>{},"Reflected content"));\n\n    if(workspace.output_mode==="RECURSION"&&(sel?.kind==="q"||sel?.kind==="content_q")){\n      const pOk=!!proj.portal?.valid;\n      row.append(\n        chip("AUTO",workspace.warp==="AUTO"&&pOk,()=>handlers.setWarp("AUTO"),"AUTO warp"),\n        chip("OFF",workspace.warp==="OFF",()=>handlers.setWarp("OFF"),"Warp off"),\n        chip("q "+workspace.q,false,()=>handlers.nudgeQ(),"Toggle q"),\n        chip("n "+workspace.n,false,()=>handlers.nudgeN(),"Cycle n")\n      );\n    }\n  }else if(phase==="STAGE"&&sel?.kind==="phone"){\n    row.appendChild(chip("PHONE WIDTH",false,()=>handlers.select({kind:"phone_width",id:"phone_width",label:"Measured phone width"}),"Measured phone width"));\n  }\n\n  if(row.childElementCount)el.appendChild(row);\n}\n''')

# Artist-facing validity text: raw constraint IDs stay in Inspect.
Path("src/ui/hud/validity_strip.js").write_text('''const HUMAN = Object.freeze({\n  elbow_in:"Phone is too close to the face for the elbow-in limit",\n  e_floor:"Move the camera farther sideways to clear the face",\n  direct_head_eclipse:"Direct head blocks the required mirror path",\n  shoulder_abduction:"Camera is beyond the shoulder-abduction limit",\n  cross_body_same_side:"Camera crosses the body beyond the cross-body limit",\n  beyond_reach:"Phone is beyond reachable arm length",\n  target_direct_head:"Direct head is outside its composition target",\n  target_reflected_body:"Reflected body is outside its composition target",\n  target_reflected_phone:"Reflected phone is outside its composition target",\n  P_INVALID:"The physical phone screen carrier is not valid from this camera",\n});\n\nfunction humanReason(proj,tx){\n  if(proj.compensation)return humanCompensation(proj.compensation);\n  const binding=proj.feasible?.binding;\n  if(binding&&HUMAN[binding])return HUMAN[binding];\n  const reason=String((proj.reasons||[])[0]||"");\n  if(HUMAN[reason])return HUMAN[reason];\n  if(reason.startsWith("target_"))return "A composition target is outside its tolerance";\n  if(tx==="PROJECTED")return "Adjusted to the nearest feasible state";\n  if(tx==="FAIL")return "The requested state is not physically valid";\n  return "feasible";\n}\n\nexport function mountValidityStrip(el, proj) {\n  el.className = "mp-valid-wrap mp-status";\n  el.replaceChildren();\n  const tx = proj.effective?.transaction || (proj.valid ? "PASS" : "FAIL");\n  const t = document.createElement("strong");\n  t.className = "mp-valid " + (tx === "PASS" ? "ok" : tx === "PROJECTED" ? "warn" : "bad");\n  t.textContent = tx;\n  el.appendChild(t);\n  const icon = document.createElement("span");\n  icon.setAttribute("aria-hidden", "true");\n  icon.textContent = tx === "PASS" ? "●" : tx === "PROJECTED" ? "▲" : "■";\n  el.appendChild(icon);\n  const r = document.createElement("span");\n  r.textContent = humanReason(proj,tx);\n  el.appendChild(r);\n}\n\nexport function humanCompensation(c) {\n  if (!c) return "";\n  if (c.variable === "mirror_distance_request_m") {\n    return `Mirror ${Number(c.from).toFixed(2)} → ${Number(c.to).toFixed(2)} m to preserve reflected phone size`;\n  }\n  return `Adjusted ${String(c.variable||"a dependent value").replaceAll("_"," ")} to preserve the active relationship`;\n}\n''')

# CSS: input modes belong to input pane; selection dock is title + one parameter row + status.
p = Path("src/ui/shell.js")
s = p.read_text()
s = s.replace(
    '.mp-output-rail .mp-chip{background:rgba(255,255,255,.9);font-size:9px;min-height:38px}',
    '.mp-output-rail .mp-chip{background:rgba(255,255,255,.9);font-size:9px;min-height:38px;min-width:88px;flex:0 0 auto;overflow:visible;text-overflow:clip}',
)
s = s.replace(
    '.mp-hud{flex:0 0 auto;background:var(--mp-panel);border-top:1px solid var(--mp-line);padding:7px 10px 8px;border-radius:14px 14px 0 0;overflow:hidden}',
    '.mp-hud{flex:0 0 auto;background:var(--mp-panel);border-top:1px solid var(--mp-line);padding:7px 10px 8px;border-radius:14px 14px 0 0;overflow:hidden;max-height:116px}',
)
s = s.replace(
    '.mp-input-modes .mp-chip.is-on{background:var(--mp-ink);color:#fff}',
    '.mp-input-wrap{position:absolute;left:64px;right:8px;bottom:8px;z-index:4;pointer-events:auto}.mp-input-modes{display:flex;flex-wrap:nowrap;gap:4px;overflow-x:auto;margin:0}.mp-input-modes .mp-chip{min-height:36px;flex:0 0 auto;background:rgba(255,255,255,.92)}.mp-input-modes .mp-chip.is-on{background:var(--mp-ink);color:#fff}',
)
s = s.replace(
    '  .mp-hud .mp-input-wrap{position:absolute;right:8px;top:8px;max-width:78%;pointer-events:auto}\n  .mp-hud .mp-input-modes{margin:0;justify-content:flex-end;background:rgba(252,251,248,.86);border-radius:999px;padding:2px}\n  .mp-hud .mp-input-modes .mp-chip{min-height:36px;font-size:9px;background:rgba(255,255,255,.94)}\n  .mp-hud .mp-input-modes .mp-chip.is-on{background:var(--mp-ink);color:#fff}\n',
    '  .mp-stage .mp-input-wrap{right:8px;left:auto;top:8px;bottom:auto;max-width:78%}\n  .mp-stage .mp-input-modes{justify-content:flex-end;background:rgba(252,251,248,.86);border-radius:999px;padding:2px}\n  .mp-stage .mp-input-modes .mp-chip{min-height:36px;font-size:9px;background:rgba(255,255,255,.94)}\n  .mp-stage .mp-input-modes .mp-chip.is-on{background:var(--mp-ink);color:#fff}\n',
)
p.write_text(s)

# Acceptance: architecture must not regress to object rooms or DECLARE-authoring.
Path("tests/v5_phase4_architecture.test.mjs").write_text('''import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport { PHASES, INPUT_MODES, OUTPUT_MODES } from "../src/ui/state/phase_state.js";\n\nconst read=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");\n\ntest("Phase 4 · literal workflow phases and pane modes",()=>{\n  assert.deepEqual(PHASES,["DECLARE","SOLVE","STAGE"]);\n  assert.deepEqual(INPUT_MODES,["VIEWPORT","NUMBERS","PLAN","ELEVATION","FEASIBLE"]);\n  assert.deepEqual(OUTPUT_MODES,["FINAL_CAMERA","COMPOSITION","MASK","RECURSION","STAGING","FULL_SENSOR"]);\n});\n\ntest("Phase 4 · object-category rooms are absent from production UI architecture",()=>{\n  const phase=read("../src/ui/state/phase_state.js"),shell=read("../src/ui/app_shell.js"),scene=read("../src/render/scene_3d.js");\n  for(const src of [phase,shell,scene]){\n    assert.doesNotMatch(src,/PHASE_TO_ROOM/);\n    assert.doesNotMatch(src,/setRoom\\s*\\(/);\n    assert.doesNotMatch(src,/room\\s*=\\s*\\{\\s*id\\s*:/);\n  }\n  assert.match(scene,/setFrameScope/);\n});\n\ntest("Phase 4 · physical authoring is SOLVE-gated, not DECLARE-gated",()=>{\n  const shell=read("../src/ui/app_shell.js");\n  assert.match(shell,/IK_JOINTS\\.includes\\(hit\\.id\\).*workspace\\.phase===\\"SOLVE\\"/);\n  assert.match(shell,/hit\\.kind===\\"phone\\"&&workspace\\.phase===\\"SOLVE\\"/);\n  assert.doesNotMatch(shell,/IK_JOINTS\\.includes\\(hit\\.id\\).*workspace\\.phase===\\"DECLARE\\"/);\n});\n\ntest("Phase 4 · input modes belong to input pane and selection dock stays contextual",()=>{\n  const shell=read("../src/ui/app_shell.js"),hud=read("../src/ui/hud/context_hud.js");\n  assert.match(shell,/stage\\.append\\(canvas, overlay, viewsEl, viewLab, toast, diagEl, modeEl\\)/);\n  assert.match(shell,/hud\\.append\\(contextEl, validEl\\)/);\n  assert.doesNotMatch(hud,/TransactionCard/);\n  assert.match(hud,/output_mode===\\"RECURSION\\"&&\\(sel\\?\\.kind===\\"q\\"\\|\\|sel\\?\\.kind===\\"content_q\\"\\)/);\n});\n''')

print("Phase 4 patch prepared")
