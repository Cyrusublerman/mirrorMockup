import { injectShellCss } from "./shell.js";
import { createWorkspaceState, NUMERIC_FRAMES } from "./state/workspace_state.js";
import { ViewState } from "./state/view_state.js";
import { PhaseState, PHASE_TO_ROOM } from "./state/phase_state.js";
import { OutputRail } from "./hud/output_rail.js";
import { createInteractionMachine } from "./state/interaction_state_machine.js";
import { createDispatchAdapter } from "./adapters/action_dispatch_adapter.js";
import { projectForHud } from "./adapters/selector_projection_adapter.js";
import { mountTopModeStrip } from "./hud/top_mode_strip.js";
import { mountContextHud } from "./hud/context_hud.js";
import { mountValidityStrip } from "./hud/validity_strip.js";
import { mountInspectDrawer } from "./hud/inspect_drawer.js";
import { mountPrecisionSheet } from "./hud/precision_sheet.js";
import { mountViewStrip } from "./hud/view_strip.js";
import { FeasiblePanel } from "./hud/feasible_panel.js";
import { ElevationPanel } from "./hud/elevation_panel.js";
import { InputModeStrip } from "./hud/input_mode_strip.js";
import { applyScreenCorner, hitScreenCorner } from "./manipulators/screen_quad.js";
import { drawOverlays } from "./overlays/composition_overlay_stack.js";
import { createReferenceLayer } from "./overlays/reference_layer.js";
import { InsetInput } from "./viewport/artwork_camera_inset.js";
import { createEditorViewport } from "./viewport/editor_viewport.js";
import { hitFromEvent } from "./viewport/scene_hit_test.js";
import { labelForHit } from "./viewport/manipulator_layer.js";
import { applySemanticJoint } from "./manipulators/semantic_joint.js";
import { applyEndpointIk } from "./manipulators/endpoint_ik.js";
import { applyRigidPhone } from "./manipulators/rigid_phone.js";
import { applyMirrorDistance, applyMirrorWindow } from "./manipulators/mirror_aperture.js";
import { applyCropPan } from "./manipulators/crop.js";
import { applyQOffset } from "./manipulators/q_portal.js";
import { createScene3D } from "../render/scene_3d.js";
import { letterboxRect } from "../render/capture_camera.js";
import { IK_JOINTS } from "../render/bone_index.js";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const MASK_RGB = Object.freeze({ 0:[239,237,231],1:[169,88,79],2:[247,227,196],3:[107,63,160],4:[132,132,132],5:[62,37,96],6:[76,109,140],7:[140,118,34] });

function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
function fail(root, msg, detail) {
  const box = el("div"); box.id = "boot-fail"; box.setAttribute("role", "alert");
  const p = el("p"); p.textContent = msg; box.appendChild(p);
  if (detail) { const pre = el("pre"); pre.textContent = detail; box.appendChild(pre); }
  root.replaceChildren(box);
}
function bytesToBlobUrl(png) { return URL.createObjectURL(new Blob([png], { type: "image/png" })); }
async function drawPng(canvas, png) {
  if (!png) return;
  const url = bytesToBlobUrl(png);
  try {
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const w = Math.max(1, canvas.clientWidth || img.width), h = Math.max(1, canvas.clientHeight || img.height);
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); ctx.clearRect(0,0,w,h); ctx.drawImage(img,0,0,w,h); img.close?.();
  } finally { URL.revokeObjectURL(url); }
}

export async function bootUi(root, app) {
  injectShellCss(root.ownerDocument);
  const workspace = createWorkspaceState();
  const viewState = new ViewState();
  const phaseState = new PhaseState();
  workspace.viewState = viewState; workspace.phaseState = phaseState;
  const machine = createInteractionMachine();
  const dispatch = createDispatchAdapter(app);
  const reference = createReferenceLayer();
  const feasiblePanel = new FeasiblePanel();
  const elevationPanel = new ElevationPanel();
  const inputModes = new InputModeStrip();
  const outputRail = new OutputRail();
  const persistentNumbers = !!globalThis.matchMedia?.("(min-width: 760px)")?.matches;
  workspace.precision = persistentNumbers;
  workspace.warp = app.getRequested().recursion.mode;
  workspace.q = app.getRequested().recursion.q;
  workspace.n = app.getRequested().recursion.n;
  workspace.drive_mode = app.getRequested().phone.authority;
  workspace.crop_mode = "FINAL_CROP";

  const shell = el("div", "mp-app");
  const strip = el("div"); strip.setAttribute("data-strip", "");

  const outputPane = el("section", "mp-output-pane"); outputPane.setAttribute("aria-label", "Output pane");
  const insetCanvas = el("canvas", "mp-output-webgl"); insetCanvas.id = "inset";
  const productCanvas = el("canvas", "mp-output-product"); productCanvas.hidden = true;
  const insetLab = el("div", "mp-inset-lab"); insetLab.textContent = "FINAL CAMERA";
  const outEl = el("div", "mp-output-controls");
  outputPane.append(insetCanvas, productCanvas, insetLab, outEl);

  const rail = el("div", "mp-swap-rail");
  const swap = el("button", "mp-chip mp-swap"); swap.type = "button"; swap.textContent = "SWAP"; swap.setAttribute("aria-label", "Swap input and output view");
  rail.appendChild(swap);

  const stage = el("section", "mp-stage"); stage.setAttribute("aria-label", "Input pane");
  const canvas = el("canvas"); canvas.id = "scene"; canvas.setAttribute("aria-label", "3D input viewport");
  const overlay = el("canvas"); overlay.id = "overlay";
  const viewsEl = el("div");
  const viewLab = el("div", "mp-view-lab");
  const toast = el("div", "mp-toast"); toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite");
  const diagEl = el("div");
  stage.append(canvas, overlay, viewsEl, viewLab, toast, diagEl);

  const hud = el("section", "mp-hud"); hud.setAttribute("aria-label", "Selection dock");
  const contextEl = el("div", "mp-context");
  const validEl = el("div", "mp-valid-wrap");
  const modeEl = el("div", "mp-input-wrap");
  hud.append(contextEl, modeEl, validEl);
  const inspectEl = el("div", "mp-inspect");
  const sheetEl = el("aside", "mp-sheet");
  const menuEl = el("div", "mp-menu");
  const more = el("button", "mp-more"); more.type = "button"; more.textContent = "···"; more.setAttribute("aria-label", "More");
  const file = el("input"); file.type = "file"; file.accept = "image/*"; file.hidden = true;
  shell.append(strip, outputPane, rail, stage, hud, inspectEl, sheetEl, menuEl, file);
  root.replaceChildren(shell);

  let scene3d;
  try { scene3d = await createScene3D(canvas, app, { insetCanvas, viewState }); }
  catch (err) { fail(root, "Viewport failed to start.", String(err?.stack || err)); throw err; }
  scene3d.setEditorView(viewState.editor_view);
  scene3d.setRoom(PHASE_TO_ROOM[workspace.phase]);

  let euler = { bend: 0, tilt: 0, twist: 0 };
  let drag = null;
  let raf = 0;
  let outputToken = 0;

  function showToast(msg) { toast.textContent = msg || ""; toast.classList.toggle("is-on", !!msg); }

  async function paintOutputProduct() {
    const token = ++outputToken;
    const mode = workspace.output_mode;
    insetLab.textContent = mode.replaceAll("_", " ");
    const webglMode = mode === "FINAL_CAMERA" || mode === "FULL_SENSOR";
    insetCanvas.hidden = !webglMode;
    productCanvas.hidden = webglMode;
    scene3d.capture.mode = mode === "FULL_SENSOR" ? "FULL_SENSOR" : "FINAL_CROP";
    if (webglMode) { scene3d.sync(); return; }
    let product = null;
    if (mode === "COMPOSITION") product = app.dispatch("EXPORT_COMPOSITION_OVERLAY", { width: 360, height: 480 }).export?.overlay;
    else if (mode === "MASK") product = app.dispatch("EXPORT_MASK", { width: 360, height: 480 }).export?.mask;
    else if (mode === "RECURSION") {
      const ex = app.dispatch("EXPORT_REFERENCE_RENDER", { width: 360, height: 480 }).export;
      product = ex?.recursive_reference || ex?.png;
    } else if (mode === "STAGING") {
      const last = app.dispatch("EXPORT_STAGING_PRESCRIPTION", { width: 360, height: 480 });
      const ctx = productCanvas.getContext("2d");
      const w = Math.max(1, productCanvas.clientWidth || 360), h = Math.max(1, productCanvas.clientHeight || 480);
      productCanvas.width = w; productCanvas.height = h; ctx.clearRect(0,0,w,h); ctx.fillStyle = "#FCFBF8"; ctx.fillRect(0,0,w,h); ctx.fillStyle = "#111"; ctx.font = "12px monospace";
      const card = last.export?.staging?.prescription?.card || {};
      const lines = ["STAGING PRESCRIPTION", `stand ${fmtM(card.stand_m)}`, `turn ${fmtDeg(card.turn_deg)}`, `phone forward ${fmtM(card.phone_forward_m)}`, `phone above eye ${fmtM(card.phone_above_eye_m)}`, `phone lateral ${fmtM(card.phone_lateral_m)}`, `hold ${card.hold || "—"}`, `lens ${card.lens || "—"}`, `weight ${card.weight || "—"}`];
      if (last.export?.staging?.refused) lines.push("REFUSED · CALIBRATION-DEPENDENT DISTANCE");
      lines.forEach((s,i) => ctx.fillText(s,16,28+i*22));
      return;
    }
    if (token === outputToken && product) await drawPng(productCanvas, product);
  }

  function fmtM(v) { return Number.isFinite(v) ? Number(v).toFixed(2) + " m" : "—"; }
  function fmtDeg(v) { return Number.isFinite(v) ? Number(v).toFixed(0) + "°" : "—"; }

  function download(name, filename) {
    const last = app.dispatch(name, { width: 640, height: 640 });
    if (name === "EXPORT_STAGING_PRESCRIPTION") {
      if (last.export?.staging?.refused || last.error) { showToast(last.error || "Staging refused while printed distances are hollow"); return; }
      const blob = new Blob([JSON.stringify({ staging: last.export.staging, sidecar: last.export.sidecar, build: app.build }, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href); return;
    }
    const buf = name === "EXPORT_COMPOSITION_OVERLAY" ? last.export.overlay : name === "EXPORT_REFERENCE_RENDER" ? (last.export.recursive_reference || last.export.png) : name === "EXPORT_MASK" ? last.export.mask : last.export.png;
    const a = document.createElement("a"); a.href = bytesToBlobUrl(buf); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  }

  function mountMenu() {
    menuEl.className = "mp-menu" + (workspace.menu ? " is-open" : ""); menuEl.replaceChildren(); if (!workspace.menu) return;
    const head = el("header"); const h = el("strong"); h.textContent = "MORE"; const x = el("button", "mp-chip"); x.type="button"; x.textContent="Close"; x.onclick=()=>{workspace.menu=false;paintHud();}; head.append(h,x);
    const row = el("div", "mp-row");
    const mk=(label,fn)=>{const b=el("button","mp-chip");b.type="button";b.textContent=label;b.onclick=fn;return b;};
    row.append(
      mk("INSPECT",()=>{workspace.menu=false;workspace.inspect=true;paintHud();}), mk("NUMBERS",()=>{workspace.menu=false;workspace.precision=true;paintHud();}), mk("REFERENCE",()=>file.click()),
      mk("EXPORT FINAL",()=>download("EXPORT_FINAL_CAMERA","final.png")), mk("EXPORT STAGING",()=>download("EXPORT_STAGING_PRESCRIPTION","staging.json")),
      mk("EXPORT OVERLAY",()=>download("EXPORT_COMPOSITION_OVERLAY","overlay.png")), mk("EXPORT RECURSION",()=>download("EXPORT_REFERENCE_RENDER","recursion.png")), mk("EXPORT MASK",()=>download("EXPORT_MASK","mask.png"))
    );
    const snaps=el("div","mp-row");
    for(const id of ["A","B","C","D","E"]){snaps.append(mk("SAVE "+id,()=>{app.dispatch("SAVE_SNAPSHOT",{id,kind:workspace.phase==="DECLARE"?"POSE":"SCENE"});workspace.menu=false;paintHud();}),mk("LOAD "+id,()=>{const last=app.dispatch("LOAD_SNAPSHOT",{id,label:"Load "+id});workspace.menu=false;if(!last.error){paintHud();paintScene();}}));}
    menuEl.append(head,row,snaps);
  }

  function handlers() {
    return {
      setDrive(mode){workspace.drive_mode=mode;app.dispatch("SET_PHONE_AUTHORITY",{authority:mode},{label:mode.replaceAll("_"," ")});paintAll();},
      setBodyMode(kind){workspace.body_mode=kind;scene3d.setBodyMode(kind);paintAll();},
      setTopology(topology){app.dispatch("SET_TOPOLOGY",{topology},{label:"Declare topology"});paintAll();},
      setPhoneScalePolicy(policy){app.dispatch("SET_PHONE_SCALE_POLICY",{policy},{label:"Declare phone scale policy"});paintAll();},
      setP0Convention(convention){app.dispatch("SET_P0_OCCUPANCY_CONVENTION",{convention},{label:"Declare P0 occupancy convention"});paintAll();},
      setHeadRadius(radius_m){app.dispatch("SET_HEAD_SILHOUETTE_RADIUS",{radius_m},{label:"Declare head silhouette radius"});paintAll();},
      setOutput(id){setOutputMode(id);},
      toggleLock(id){const on=!app.getRequested().composition.locks?.[id];app.dispatch("SET_LOCK_CHIP",{id,on},{label:(on?"Locked ":"Unlocked ")+id});paintAll();},
      cycleOpacity(){const cur=reference.opacity;const next=cur>=0.8?0.15:Math.min(1,cur+0.25);reference.setOpacity(next);app.dispatch("SET_REFERENCE_REGISTRATION",{opacity:next},{preview:true});paintAll();},
      setWarp(mode){const proj=projectForHud(app);if(mode==="AUTO"&&!proj.portal?.valid){showToast("AUTO refused — "+(proj.reasons[0]||"P invalid"));return;}workspace.warp=mode;app.dispatch("SET_PRINT_GALLERY_MODE",{mode},{label:"Warp "+mode});paintAll();},
      nudgeQ(){workspace.q=workspace.q===1?-1:1;app.dispatch("SET_RECURSION_PARAMETER",{q:workspace.q},{label:"Set q"});paintAll();},
      nudgeN(){workspace.n=(workspace.n+1)%4;app.dispatch("SET_RECURSION_PARAMETER",{n:workspace.n},{label:"Set n"});paintAll();},
      select(sel){workspace.selected=sel;app.dispatch("SET_SELECTION",{selection:sel.id||sel.kind},{preview:true});if(persistentNumbers)workspace.precision=true;paintHud();},
      setAxis(axis){workspace.axis=axis;if(workspace.selected)workspace.selected.axis=axis;paintHud();},
    };
  }

  function setOutputMode(id) {
    workspace.output_mode=id; phaseState.setOutput(id); app.dispatch("SET_OUTPUT_MODE",{mode:id},{preview:true});
    if(id==="RECURSION") handlers().setWarp("AUTO"); else { paintHud(); paintScene(); paintOutputProduct(); }
  }

  function cycleFrame(){const i=NUMERIC_FRAMES.indexOf(workspace.numeric_frame);workspace.numeric_frame=NUMERIC_FRAMES[(i+1)%NUMERIC_FRAMES.length];paintHud();}

  function precisionFields() {
    const req=app.getRequested(), eff=app.getEffective(), sel=workspace.selected;
    if(sel?.kind==="joint"){
      const e=req.body.pose_targets.btt_euler?.[sel.id]||{bend:0,tilt:0,twist:0};
      return [{key:"theta_deg",label:"theta · bend (deg)",value:e.bend*DEG},{key:"phi_deg",label:"phi · plane (deg)",value:e.tilt*DEG,min:-12,max:12},{key:"psi_deg",label:"psi · twist (deg)",value:e.twist*DEG}];
    }
    if(sel?.kind==="arm7"){
      const a=eff.arm_seven||{}, w=req.body.pose_targets.btt_euler?.wrist_R||{bend:0,tilt:0,twist:0};
      return [
        {key:"r",label:"hand r (m)",value:a.r||0},{key:"theta_deg",label:"hand theta (deg)",value:(a.theta||0)*DEG},{key:"phi_deg",label:"hand phi (deg)",value:(a.phi||0)*DEG},
        {key:"swivel_deg",label:"swivel (deg)",value:(req.body.pose_targets.swivel?.arm_R||0)*DEG},{key:"wrist_bend_deg",label:"wrist bend (deg)",value:w.bend*DEG},{key:"wrist_tilt_deg",label:"wrist tilt (deg)",value:w.tilt*DEG},{key:"wrist_rotate_deg",label:"wrist rotate (deg)",value:w.twist*DEG},
      ];
    }
    if(sel?.kind==="torso"){
      const p=req.body.pose_targets.btt_euler?.pelvis||{bend:0,tilt:0,twist:0}, r=req.body.pose_targets.btt_euler?.ribcage||{bend:0,tilt:0,twist:0};
      return [
        {key:"pelvis_yaw",label:"pelvis yaw (deg)",value:p.twist*DEG},{key:"pelvis_tilt",label:"pelvis tilt (deg)",value:p.tilt*DEG},{key:"pelvis_lean",label:"pelvis lean (deg)",value:p.bend*DEG},
        {key:"ribcage_yaw",label:"ribcage yaw (deg) · rel pelvis",value:r.twist*DEG},{key:"ribcage_tilt",label:"ribcage tilt (deg) · rel pelvis",value:r.tilt*DEG},{key:"ribcage_lean",label:"ribcage lean (deg) · rel pelvis",value:r.bend*DEG},
        {key:"head_aim",label:"head aim",value:"mirror centre",readonly:true,type:"text"},
      ];
    }
    if(sel?.kind==="phone"){
      const a=eff.arm_seven||{};
      return [{key:"p_r",label:"head-frame r · readout",value:a.r||0,readonly:true},{key:"p_theta",label:"head-frame theta · readout",value:(a.theta||0)*DEG,readonly:true},{key:"p_phi",label:"head-frame phi · readout",value:(a.phi||0)*DEG,readonly:true},{key:"f",label:"phone scale f",value:eff.phone_scale||0,readonly:req.composition.phone_scale_policy!=="SOLVED"}];
    }
    if(sel?.kind==="phone_width")return[{key:"phone_width_m",label:"measured phone width (m)",value:req.phone.body_dimensions_m.width}];
    if(sel?.id==="d_M")return[{key:"d_M",label:"d_M (m)",value:req.apparatus.mirror_distance_request_m}];
    if(sel?.kind==="crop"){const p=req.camera.crop_request.pan;return[{key:"u",label:"crop U",value:p[0]},{key:"v",label:"crop V",value:p[1]}];}
    return [{key:"hfov_deg",label:"HFOV (deg)",value:req.camera.hfov_request*DEG}];
  }

  function applyPrecision(out) {
    const sel=workspace.selected;
    if(sel?.kind==="joint"){app.dispatch("SET_ANATOMICAL_DOF",{joint:sel.id,bend:(out.theta_deg||0)*RAD,tilt:(out.phi_deg||0)*RAD,twist:(out.psi_deg||0)*RAD},{label:"Numeric "+sel.id});return;}
    if(sel?.kind==="arm7"){
      const head=app.getEffective().skeleton?.fk?.head;if(!head)return;
      const r=out.r??0,th=(out.theta_deg??0)*RAD,ph=(out.phi_deg??0)*RAD;
      const world=[head[0]+r*Math.sin(th)*Math.sin(ph),head[1]+r*Math.sin(th)*Math.cos(ph),head[2]+r*Math.cos(th)];
      app.dispatch("SET_ARM_SEVEN",{world,swivel:(out.swivel_deg||0)*RAD,wrist_bend:(out.wrist_bend_deg||0)*RAD,wrist_tilt:(out.wrist_tilt_deg||0)*RAD,wrist_rotate:(out.wrist_rotate_deg||0)*RAD},{label:"Right arm · 7 DOF"});return;
    }
    if(sel?.kind==="torso"){app.dispatch("SET_TORSO_BOXES",{pelvis:{yaw:(out.pelvis_yaw||0)*RAD,tilt:(out.pelvis_tilt||0)*RAD,lean:(out.pelvis_lean||0)*RAD},ribcage:{yaw:(out.ribcage_yaw||0)*RAD,tilt:(out.ribcage_tilt||0)*RAD,lean:(out.ribcage_lean||0)*RAD}},{label:"Torso · three boxes"});return;}
    if(sel?.kind==="phone"&&out.f!=null){app.dispatch("SET_PHONE_SCALE",{f:out.f},{label:"Phone scale"});return;}
    if(sel?.kind==="phone_width"&&out.phone_width_m!=null){app.dispatch("SET_PHONE_WIDTH_MEASUREMENT",{width_m:out.phone_width_m},{label:"Measured phone width"});return;}
    if(sel?.id==="d_M"&&out.d_M!=null){app.dispatch("SET_MIRROR_DISTANCE",{d_M:out.d_M},{label:"Numeric d_M"});return;}
    if(sel?.kind==="crop"){app.dispatch("PAN_OUTER_FRAME",{pan:[out.u,out.v]},{label:"Numeric crop"});return;}
    if(out.hfov_deg!=null)app.dispatch("SET_CAMERA_FOV",{hfov:out.hfov_deg*RAD},{label:"Numeric HFOV"});
  }

  function paintHud() {
    const proj=projectForHud(app);
    mountTopModeStrip(strip,workspace,(phase)=>{workspace.phase=phase;phaseState.setPhase(phase);scene3d.setRoom(PHASE_TO_ROOM[phase]);app.dispatch("SET_PHASE",{phase},{preview:true});paintAll();});
    if(!strip.contains(more))strip.appendChild(more);
    outputRail.mount(outEl,workspace.output_mode,setOutputMode);
    mountViewStrip(viewsEl,workspace,(id)=>{viewState.setEditorView(id);viewState.setMainPane("EDITOR");workspace.editor_view=id;scene3d.setEditorView(id);paintAll();});
    mountContextHud(contextEl,workspace,proj,handlers());
    inputModes.mount(modeEl,workspace.input_mode,(id)=>{workspace.input_mode=id;phaseState.setInput(id);app.dispatch("SET_INPUT_MODE",{mode:id},{preview:true});if(id==="NUMBERS")workspace.precision=true;if(id==="PLAN"){viewState.setEditorView("TOP");workspace.editor_view="TOP";scene3d.setEditorView("TOP");}if(id==="ELEVATION"){viewState.setEditorView("LEFT");workspace.editor_view="LEFT";scene3d.setEditorView("LEFT");}paintAll();});
    if(workspace.input_mode==="FEASIBLE")feasiblePanel.mount(diagEl,proj.feasible,undefined,(b)=>{workspace.selected={kind:"constraint",id:b.id,label:b.label||b.id};workspace.inspect=true;paintHud();});
    else if(workspace.input_mode==="ELEVATION")elevationPanel.mount(diagEl,proj.aperture_band,(z)=>{app.dispatch("SET_MIRROR_HEIGHT",{z},{label:"Mount height"});paintAll();});
    else{diagEl.hidden=true;diagEl.replaceChildren();}
    mountValidityStrip(validEl,proj);
    mountInspectDrawer(inspectEl,workspace.inspect,proj,workspace,{close(){workspace.inspect=false;paintHud();},toggleOverlay(id){workspace.overlays[id]=!workspace.overlays[id];paintAll();},toggleLock(id){handlers().toggleLock(id);},cycleIntent(id,rule){const order=["REQUIRED","PERMITTED","PROHIBITED","IGNORE","TARGET"];const next=order[(order.indexOf(rule.state)+1)%order.length];app.dispatch("SET_OCCLUSION_INTENT",{id,state:next,min:rule.min,max:rule.max,allowed_occluders:rule.allowed_occluders},{label:"Intent "+id});paintAll();}});
    mountPrecisionSheet(sheetEl,workspace.precision,precisionFields(),(out)=>{applyPrecision(out);if(!persistentNumbers)workspace.precision=false;paintAll();},()=>{if(!persistentNumbers)workspace.precision=false;paintHud();},{persistent:persistentNumbers,frame:workspace.numeric_frame,onCycleFrame:cycleFrame,title:"NUMBERS"});
    mountMenu();
  }

  function paintSceneNow() {
    scene3d.sync();
    const w=Math.max(1,canvas.clientWidth||stage.clientWidth||1),h=Math.max(1,canvas.clientHeight||stage.clientHeight||1);
    const captureMain=viewState.main_pane==="CAPTURE"; viewLab.textContent=captureMain?"CAPTURE":viewState.editor_view;
    const ctx=overlay.getContext("2d");overlay.style.left="0";overlay.style.top="0";overlay.style.width="100%";overlay.style.height="100%";overlay.width=w;overlay.height=h;ctx.clearRect(0,0,w,h);
    if(captureMain){const box=letterboxRect(w,h,3/4);overlay.style.left=`${box.x}px`;overlay.style.top=`${box.y}px`;overlay.style.width=`${box.w}px`;overlay.style.height=`${box.h}px`;overlay.width=Math.max(1,Math.floor(box.w));overlay.height=Math.max(1,Math.floor(box.h));reference.draw(ctx,overlay.width,overlay.height);drawOverlays(ctx,overlay.width,overlay.height,workspace,projectForHud(app));}
  }
  function paintScene(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;paintSceneNow();paintOutputProduct();});}
  function paintAll(){paintHud();paintScene();}

  more.onclick=()=>{workspace.menu=!workspace.menu;paintHud();};
  file.onchange=async()=>{const f=file.files?.[0];if(!f)return;await reference.loadFile(f);paintScene();};
  swap.onclick=()=>{scene3d.swapInset();workspace.editor_view=scene3d.workspace.editor_view;paintAll();};

  new InsetInput().bind(outputPane,{
    cameraEdit:()=>workspace.selected?.kind==="camera"||workspace.selected?.kind==="crop"||viewState.main_pane==="CAPTURE",
    getHfov:()=>app.getRequested().camera.hfov_request,
    setHfov(hfov){dispatch.startGesture("Changed FOV");dispatch.preview("SET_CAMERA_FOV",{hfov});paintScene();},onPinchStart(){dispatch.startGesture("Changed FOV");},
    onHit(){},onUp(){dispatch.endGesture();},onSwap(){scene3d.swapInset();workspace.editor_view=scene3d.workspace.editor_view;paintAll();},
  });

  function beginDragFromHit(hit,req){
    if(workspace.phase==="STAGE"){drag={kind:"orbit",started:false};return;}
    if(hit.kind==="joint"&&IK_JOINTS.includes(hit.id)&&workspace.phase==="DECLARE"){const world=(req.body.pose_targets.endpoint_targets[hit.id]||app.getEffective().skeleton.fk[hit.id]||hit.point).slice();drag={kind:"ik",end:hit.id,world,started:false};}
    else if(hit.kind==="joint"&&workspace.phase==="DECLARE"){euler={...(req.body.pose_targets.btt_euler?.[hit.id]||{bend:0,tilt:0,twist:0})};drag={kind:"joint",joint:hit.id,started:false};}
    else if(hit.kind==="phone"&&workspace.phase==="DECLARE")drag={kind:"phone",translation:req.phone.transform_request.translation.slice(),started:false};
    else if(hit.kind==="mirror"&&workspace.phase==="SOLVE"){const id=workspace.selected?.id==="window"?"window":"d_M";workspace.selected={kind:"mirror",id,label:id==="window"?"Mirror window pan":"Mirror distance"};drag={kind:id,d_M:req.apparatus.mirror_distance_request_m,uv:req.apparatus.mirror_pan_uv_request_m.slice(),started:false};}
    else drag={kind:"orbit",started:false};
  }

  createEditorViewport(canvas,scene3d,machine,{
    onDown(ev,p){
      if(viewState.main_pane==="CAPTURE"&&workspace.phase==="DECLARE"){
        const box=overlay.getBoundingClientRect();if(box.width>0&&box.height>0){const uv=[(ev.clientX-box.left)/box.width,(ev.clientY-box.top)/box.height];const quad=projectForHud(app).portal?.P?.quad;const corner=hitScreenCorner(quad,uv);if(corner>=0){workspace.selected={kind:"phone",id:"screen_"+corner,label:"Screen corner "+(corner+1)};drag={kind:"screen_corner",index:corner,uv:quad[corner].slice(),started:false};machine.beginSelect(p.id,p);paintHud();return;}}
      }
      const hit=hitFromEvent(scene3d,ev);if(hit){workspace.selected={kind:hit.kind,id:hit.id,label:labelForHit(hit),axis:workspace.axis};app.dispatch("SET_SELECTION",{selection:hit.id||hit.kind},{preview:true});beginDragFromHit(hit,app.getRequested());machine.beginSelect(p.id,p);paintHud();return;}
      if(workspace.phase==="SOLVE"&&workspace.selected?.kind==="crop"){drag={kind:"crop",pan:app.getRequested().camera.crop_request.pan.slice(),started:false};machine.beginSelect(p.id,p);return;}
      if(workspace.output_mode==="RECURSION"&&workspace.selected?.kind==="q"){drag={kind:"q",offset:app.getRequested().content_q.offset.slice(),started:false};machine.beginSelect(p.id,p);return;}
      if(workspace.phase==="SOLVE"&&workspace.selected?.id==="apparatus"){drag={kind:"apparatus",pan:app.getRequested().apparatus.apparatus_pan_request_m.slice(),started:false};machine.beginSelect(p.id,p);return;}
      if(workspace.phase==="SOLVE"&&workspace.selected?.id==="reflected"){drag={kind:"reflected",started:false};machine.beginSelect(p.id,p);return;}
      if(viewState.main_pane!=="CAPTURE"){drag={kind:"orbit",started:false};machine.beginOrbit(p.id,p);}else{drag=null;machine.clear();}
    },
    onMove(ev,p){const step=machine.move(p.id,p);if(!step||!drag)return;if(!drag.started&&Math.hypot(step.dx,step.dy)<2)return;if(!drag.started){const labels={ik:"Moved "+drag.end,joint:"Rotated "+drag.joint,phone:"Moved phone",screen_corner:"Dragged screen corner",d_M:"Changed mirror distance",window:"Panned mirror window",crop:"Panned crop",q:"Moved Q",apparatus:"Panned apparatus",reflected:"Panned reflected content"};if(drag.kind!=="orbit")dispatch.startGesture(labels[drag.kind]||"Edit");drag.started=true;}
      if(drag.kind==="orbit"){scene3d.orbit(step.dx,step.dy);paintScene();return;}
      const worldD=scene3d.dragDeltaWorld(step.dx,step.dy);
      if(drag.kind==="ik"){drag.world=[drag.world[0]+worldD[0],drag.world[1]+worldD[1],drag.world[2]+worldD[2]];applyEndpointIk(dispatch,drag.end,drag.world,true);}
      else if(drag.kind==="joint")euler=applySemanticJoint(dispatch,drag.joint,euler,workspace.axis,-step.dy*0.01,true);
      else if(drag.kind==="phone"){drag.translation=[drag.translation[0]+worldD[0],drag.translation[1]+worldD[1],drag.translation[2]+worldD[2]];applyRigidPhone(dispatch,drag.translation,true);}
      else if(drag.kind==="screen_corner"){const box=overlay.getBoundingClientRect();drag.uv=[drag.uv[0]+step.dx/Math.max(1,box.width),drag.uv[1]+step.dy/Math.max(1,box.height)];const xf=app.solveScreenCorner(drag.index,drag.uv);applyScreenCorner(dispatch,xf,true);}
      else if(drag.kind==="d_M"){drag.d_M=Math.max(0.25,drag.d_M-step.dy*0.004);applyMirrorDistance(dispatch,drag.d_M,true);}
      else if(drag.kind==="window"){drag.uv=[drag.uv[0]+step.dx*0.001,drag.uv[1]-step.dy*0.001];applyMirrorWindow(dispatch,drag.uv,true);}
      else if(drag.kind==="crop"){drag.pan=[drag.pan[0]+step.dx*0.001,drag.pan[1]-step.dy*0.001];applyCropPan(dispatch,drag.pan,true);}
      else if(drag.kind==="q"){drag.offset=[drag.offset[0]+step.dx*0.001,drag.offset[1]-step.dy*0.001];applyQOffset(dispatch,drag.offset,true);}
      else if(drag.kind==="apparatus"){drag.pan=[drag.pan[0]+step.dx*0.001,drag.pan[1]-step.dy*0.001];dispatch.preview("PAN_APPARATUS",{pan:drag.pan});}
      else if(drag.kind==="reflected")dispatch.preview("PAN_REFLECTED_CONTENT",{delta:[step.dx*0.001,-step.dy*0.001]});
      paintAll();
    },
    onUp(ev,p){machine.end(p.id);dispatch.endGesture();drag=null;paintAll();},
    onDolly(factor){if(viewState.main_pane==="CAPTURE")return;scene3d.dolly(factor);paintScene();},
  });

  window.addEventListener("keydown",(e)=>{if(e.key==="Escape"){if(!persistentNumbers)workspace.precision=false;workspace.inspect=false;workspace.menu=false;machine.clear();paintHud();return;}if(e.target.closest?.("input, textarea, select"))return;const meta=e.ctrlKey||e.metaKey;if(meta&&(e.key==="z"||e.key==="Z")){e.preventDefault();app.dispatch(e.shiftKey?"REDO":"UNDO");paintAll();return;}if(meta&&(e.key==="y"||e.key==="Y")){e.preventDefault();app.dispatch("REDO");paintAll();}});
  if(typeof ResizeObserver==="function")new ResizeObserver(()=>paintScene()).observe(stage);else window.addEventListener("resize",paintScene);

  paintHud();paintSceneNow();await paintOutputProduct();
  if(typeof document!=="undefined")document.documentElement.dataset.booted="1";
  const api={app,workspace,viewState,scene3d,paintHud,paintScene,paintSceneNow,paintOutputProduct};if(typeof window!=="undefined")window.__MIRROR__=api;return api;
}

export async function boot(root){const {createApp}=await import("../app/facade.js");return bootUi(root,createApp());}
