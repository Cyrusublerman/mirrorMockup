import { defaultRequestedState } from "../scene/requested_state.js";
import { solve } from "../scene/solve_network.js";
import { applyAction } from "./actions.js";
import { createHistory, pushHistory, undo as histUndo, redo as histRedo, lastLabel } from "../scene/history.js";
import * as selectors from "./selectors.js";
import { packProject, unpackProject } from "./project_io.js";
import { exportImage } from "../domains/export/image.js";
import { solveScreenCornerTransform } from "../domains/carrier_p/inverse_drag.js";
import { BUILD } from "./build_identity.js";

function cloneMerge(base,patch){const next=structuredClone(base);for(const[k,v]of Object.entries(patch)){if(v&&typeof v==="object"&&!Array.isArray(v)&&next[k]&&typeof next[k]==="object")Object.assign(next[k],v);else next[k]=v;}return next;}
const NO_HISTORY=new Set(["UNDO","REDO","EXPORT_IMAGE","EXPORT_FINAL_CAMERA","EXPORT_STAGING_PRESCRIPTION","EXPORT_COMPOSITION_OVERLAY","EXPORT_REFERENCE_RENDER","EXPORT_MASK","SAVE_SNAPSHOT"]);
const PHYSICAL_COMP_ACTIONS=new Set(["MOVE_PHONE","ROTATE_PHONE","MOVE_POSE_TARGET","SET_ANATOMICAL_DOF","SET_ARM_SEVEN","SET_TORSO_BOXES"]);

export function createApp(){
  let requested=defaultRequestedState();
  let last=solve(requested);
  requested=structuredClone(last.requested);
  let previewRequested=null;
  const history=createHistory(),snapshots={};
  function activeRequested(){return previewRequested||requested;}
  function resolve(req){last=solve(req);return last;}
  function inferCompensation(beforeEff,name){
    if(last.effective?.compensation||!PHYSICAL_COMP_ACTIONS.has(name)||!activeRequested().apparatus?.mirror_distance_auto_solve)return;
    const a=beforeEff?.mirror?.centre,b=last.effective?.mirror?.centre;if(!a||!b)return;
    const moved=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);if(moved<=1e-7)return;
    const from=beforeEff?.apparatus?.d_M,to=last.effective?.apparatus?.d_M;if(!Number.isFinite(from)||!Number.isFinite(to))return;
    const comp={variable:"mirror_distance_request_m",from,to,reason:"preserved_reflected_phone_ratio",inspectable:true,depth_order:"PROJECTED"};
    last.effective.compensation=comp;
    last.effective.constraints=[...(last.effective.constraints||[]),{state:"PROJECTED",constraint_id:"autosolve_d_M",requested:from,effective:to,residual:to-from,tolerance:null,reason:comp.reason,moved_variables:[comp.variable]}];
    if(last.effective.transaction==="PASS")last.effective.transaction="PROJECTED";
    if(last.transaction==="PASS")last.transaction="PROJECTED";
  }
  function snapshotExternalCamera(result,beforeEff,name,payload){
    if(name!=="SET_TOPOLOGY"||payload.topology!=="CAMERA_BETWEEN"||result.requested.camera.external_transform_request)return;
    const w=beforeEff?.camera?.world;
    if(!w?.translation||!w?.rotation)return;
    result.requested.camera.external_transform_request={translation:w.translation.slice(),rotation:w.rotation.slice()};
    result.requested.camera.external_transform_epistemic="HYPOTHESIS";
  }

  function dispatch(name,payload={},opts={}){
    if(name==="UNDO"){previewRequested=null;requested=histUndo(history,requested);return resolve(requested);}
    if(name==="REDO"){previewRequested=null;requested=histRedo(history,requested);return resolve(requested);}
    if(name==="SAVE_SNAPSHOT"){
      snapshots[payload.id]={kind:payload.kind||"SCENE",state:structuredClone(activeRequested())};
      if(payload.kind==="POSE")snapshots[payload.id].state={body:structuredClone(activeRequested().body)};
      if(payload.kind==="WORKSPACE")snapshots[payload.id].state={workspace:structuredClone(activeRequested().workspace),view:structuredClone(activeRequested().view),reference:{registration:structuredClone(activeRequested().reference.registration)}};
      return last;
    }
    if(name==="LOAD_SNAPSHOT"){
      if(!snapshots[payload.id])return{...last,error:"no snapshot"};pushHistory(history,requested,payload.label||"Load snapshot");previewRequested=null;const snap=snapshots[payload.id];
      if(snap.kind==="POSE")requested=cloneMerge(requested,{body:snap.state.body});else if(snap.kind==="WORKSPACE")requested=cloneMerge(requested,snap.state);else requested=structuredClone(snap.state);return resolve(requested);
    }
    if(["EXPORT_IMAGE","EXPORT_FINAL_CAMERA","EXPORT_STAGING_PRESCRIPTION","EXPORT_COMPOSITION_OVERLAY","EXPORT_REFERENCE_RENDER","EXPORT_MASK"].includes(name)){
      const req=activeRequested();resolve(req);last.export=exportImage(req,last.effective,{...payload,product:name});last.export.sidecar={...last.export.sidecar,build:BUILD,solver:last.effective.solver};if(name==="EXPORT_STAGING_PRESCRIPTION"&&last.export.staging?.refused)last.error="staging refused: hollow distances";return last;
    }
    const beforeEff=last.effective;
    const base=opts.preview?(previewRequested||requested):requested,result=applyAction(base,name,payload);if(result.error)return{...last,error:result.error};
    snapshotExternalCamera(result,beforeEff,name,payload);
    if(opts.preview){previewRequested=result.requested;resolve(previewRequested);inferCompensation(beforeEff,name);return last;}
    if(!NO_HISTORY.has(name))pushHistory(history,requested,opts.label||name);previewRequested=null;requested=result.requested;resolve(requested);inferCompensation(beforeEff,name);
    if(requested.workspace.pending_mirror_fit&&last.effective.proposal){requested.workspace.proposal=structuredClone(last.effective.proposal);requested.workspace.pending_mirror_fit=false;resolve(requested);}return last;
  }
  return{
    dispatch,beginUndoGroup:(label="")=>pushHistory(history,requested,label),
    commitPreview:()=>{if(!previewRequested)return last;requested=previewRequested;previewRequested=null;return resolve(requested);},
    discardPreview:()=>{previewRequested=null;return resolve(requested);},
    getRequested:()=>activeRequested(),getEffective:()=>last.effective,getLast:()=>last,selectors,lastHistoryLabel:()=>lastLabel(history),build:BUILD,
    solveScreenCorner:(index,targetUv)=>solveScreenCornerTransform(activeRequested(),index,targetUv),
    pack:()=>packProject(activeRequested(),last.effective),
    load:(data)=>{previewRequested=null;requested=unpackProject(data);return resolve(requested);},
  };
}
