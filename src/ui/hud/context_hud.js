import { TransactionCard } from "./transaction_card.js";
const transactionCard=new TransactionCard();
function chip(label,on,fn,name){const b=document.createElement("button");b.type="button";b.className="mp-chip"+(on?" is-on":"");b.textContent=label;b.setAttribute("aria-pressed",on?"true":"false");if(name)b.setAttribute("aria-label",name);b.addEventListener("click",fn);return b;}

export function mountContextHud(el,workspace,proj,handlers){
  el.replaceChildren();const title=document.createElement("div");title.className="mp-sel";title.textContent=workspace.selected?workspace.selected.label:"Tap the figure, phone or mirror";el.appendChild(title);
  const row=document.createElement("div");row.className="mp-row mp-param-row";const sel=workspace.selected,phase=workspace.phase;
  if(phase==="DECLARE"){
    if(sel?.kind==="joint"&&! ["wrist_R","wrist_L","head","ankle_L","ankle_R"].includes(sel.id)){for(const a of["BEND","TILT","ROTATE"])row.appendChild(chip(a,workspace.axis===a,()=>handlers.setAxis(a),a));}
    else if(sel?.kind==="phone"){row.append(chip("PHONE DRIVES",workspace.drive_mode==="PHONE_DRIVES_HAND",()=>handlers.setDrive("PHONE_DRIVES_HAND"),"Phone drives hand"),chip("HAND DRIVES",workspace.drive_mode==="HAND_DRIVES_PHONE",()=>handlers.setDrive("HAND_DRIVES_PHONE"),"Hand drives phone"),chip("LOCK GRIP",workspace.drive_mode==="LOCK_GRIP",()=>handlers.setDrive("LOCK_GRIP"),"Lock grip"));}
    else if(sel?.kind==="arm7")row.appendChild(chip("RIGHT ARM · 7",true,()=>handlers.openNumbers?.(),"Right arm numbers"));
    else if(sel?.kind==="torso")row.appendChild(chip("TORSO · 3 BOXES",true,()=>handlers.openNumbers?.(),"Torso numbers"));
    else{
      const topo=proj.requested?.camera?.topology_request,topoDeclared=proj.requested?.camera?.topology_epistemic==="DECLARED",policy=proj.requested?.composition?.phone_scale_policy||"UNRESOLVED",conv=proj.requested?.reference?.p0_occupancy_convention,rr=proj.requested?.reference?.head_silhouette_radius_m;
      row.append(
        chip("GESTURE",workspace.body_mode==="GESTURE",()=>handlers.setBodyMode("GESTURE"),"Gesture representation"),chip("VOLUME",workspace.body_mode==="VOLUME",()=>handlers.setBodyMode("VOLUME"),"Volume representation"),chip("CONTOUR",workspace.body_mode==="CONTOUR",()=>handlers.setBodyMode("CONTOUR"),"Contour representation"),chip("OPACITY",false,()=>handlers.cycleOpacity(),"Reference opacity"),
        chip("FRONT CAMERA",topo==="FRONT_CAMERA_SELFIE"&&topoDeclared,()=>handlers.setTopology("FRONT_CAMERA_SELFIE"),"Declare front-camera selfie topology"),chip("CAMERA BETWEEN",topo==="CAMERA_BETWEEN"&&topoDeclared,()=>handlers.setTopology("CAMERA_BETWEEN"),"Declare camera-between topology"),
        chip("f UNRESOLVED",policy==="UNRESOLVED",()=>handlers.setPhoneScalePolicy("UNRESOLVED"),"Phone scale unresolved"),chip("f SOLVED",policy==="SOLVED",()=>handlers.setPhoneScalePolicy("SOLVED"),"Phone scale solved"),chip("f INDEPENDENT",policy==="INDEPENDENT",()=>handlers.setPhoneScalePolicy("INDEPENDENT"),"Phone scale independent"),
        chip("P0 SILHOUETTE",conv==="SILHOUETTE",()=>handlers.setP0Convention("SILHOUETTE"),"Declare P0 occupancy silhouette"),chip("P0 BBOX",conv==="BBOX",()=>handlers.setP0Convention("BBOX"),"Declare P0 occupancy bbox"),
        chip("HEAD r .115",Math.abs((rr||0)-.115)<1e-9,()=>handlers.setHeadRadius(.115),"Declare hair-included head radius"),chip("HEAD r .105",Math.abs((rr||0)-.105)<1e-9,()=>handlers.setHeadRadius(.105),"Declare hair-excluded head radius")
      );
    }
  }else if(phase==="SOLVE"){
    row.append(chip("d_M",sel?.id==="d_M",()=>handlers.select({kind:"mirror",id:"d_M",label:"Mirror distance"}),"Mirror distance"),chip("WINDOW",sel?.id==="window",()=>handlers.select({kind:"mirror",id:"window",label:"Mirror window pan"}),"Pan mirror window"),chip("APPARATUS",sel?.id==="apparatus",()=>handlers.select({kind:"apparatus",id:"apparatus",label:"Apparatus pan"}),"Pan apparatus"),chip("CROP",sel?.kind==="crop",()=>handlers.select({kind:"crop",id:"crop",label:"Crop pan"}),"Pan crop"),chip("REFLECTED",sel?.id==="reflected",()=>handlers.select({kind:"reflected",id:"reflected",label:"Pan reflected content"}),"Pan reflected content"));
  }else row.append(chip("STAGING",workspace.output_mode==="STAGING",()=>handlers.setOutput?.("STAGING"),"Staging output"),chip("PHONE WIDTH",sel?.kind==="phone_width",()=>handlers.select({kind:"phone_width",id:"phone_width",label:"Measured phone width"}),"Measured phone width"));
  if(workspace.output_mode==="RECURSION"){const pOk=!!proj.portal?.valid;row.append(chip("AUTO",workspace.warp==="AUTO"&&pOk,()=>handlers.setWarp("AUTO"),"AUTO warp"),chip("OFF",workspace.warp==="OFF",()=>handlers.setWarp("OFF"),"Warp off"),chip("q "+workspace.q,false,()=>handlers.nudgeQ(),"Toggle q"),chip("n "+workspace.n,false,()=>handlers.nudgeN(),"Cycle n"));}
  el.appendChild(row);const txn=document.createElement("div");transactionCard.mount(txn,proj);el.appendChild(txn);
}
