function chip(label,on,fn,name){const b=document.createElement("button");b.type="button";b.className="mp-chip"+(on?" is-on":"");b.textContent=label;b.setAttribute("aria-pressed",on?"true":"false");if(name)b.setAttribute("aria-label",name);if(fn)b.addEventListener("click",fn);return b;}

function addRepresentation(row,workspace,handlers){
  row.append(
    chip("GESTURE",workspace.body_mode==="GESTURE",()=>handlers.setBodyMode("GESTURE"),"Gesture representation"),
    chip("VOLUME",workspace.body_mode==="VOLUME",()=>handlers.setBodyMode("VOLUME"),"Volume representation"),
    chip("CONTOUR",workspace.body_mode==="CONTOUR",()=>handlers.setBodyMode("CONTOUR"),"Contour representation")
  );
}

export function mountContextHud(el,workspace,proj,handlers){
  el.replaceChildren();
  const sel=workspace.selected,phase=workspace.phase;
  const title=document.createElement("div");title.className="mp-sel";
  title.textContent=sel?.label||(phase==="DECLARE"?"Declare evidence and apparatus assumptions":phase==="SOLVE"?"Select the body, phone, mirror or camera":"Stage the accepted solution");
  el.appendChild(title);
  const row=document.createElement("div");row.className="mp-row mp-param-row";

  if(phase==="DECLARE"){
    if(sel?.kind==="phone"||sel?.kind==="camera"){
      const topo=proj.requested?.camera?.topology_request,declared=proj.requested?.camera?.topology_epistemic==="DECLARED",policy=proj.requested?.composition?.phone_scale_policy||"UNRESOLVED";
      row.append(
        chip("FRONT CAMERA",topo==="FRONT_CAMERA_SELFIE"&&declared,()=>handlers.setTopology("FRONT_CAMERA_SELFIE"),"Declare front-camera selfie topology"),
        chip("CAMERA BETWEEN",topo==="CAMERA_BETWEEN"&&declared,()=>handlers.setTopology("CAMERA_BETWEEN"),"Declare camera-between topology"),
        chip("f UNRESOLVED",policy==="UNRESOLVED",()=>handlers.setPhoneScalePolicy("UNRESOLVED"),"Phone scale unresolved"),
        chip("f SOLVED",policy==="SOLVED",()=>handlers.setPhoneScalePolicy("SOLVED"),"Phone scale solved"),
        chip("f INDEPENDENT",policy==="INDEPENDENT",()=>handlers.setPhoneScalePolicy("INDEPENDENT"),"Phone scale independent")
      );
    }else if(sel?.kind==="body"||sel?.kind==="joint"||sel?.kind==="torso"||sel?.kind==="arm7"){
      const rr=proj.requested?.reference?.head_silhouette_radius_m;
      addRepresentation(row,workspace,handlers);
      row.append(
        chip("HEAD r .115",Math.abs((rr||0)-.115)<1e-9,()=>handlers.setHeadRadius(.115),"Declare hair-included head radius"),
        chip("HEAD r .105",Math.abs((rr||0)-.105)<1e-9,()=>handlers.setHeadRadius(.105),"Declare hair-excluded head radius")
      );
    }
  }else if(phase==="SOLVE"){
    if(sel?.kind==="joint"&&!["wrist_R","wrist_L","head","ankle_L","ankle_R"].includes(sel.id)){
      for(const a of["BEND","TILT","ROTATE"])row.appendChild(chip(a,workspace.axis===a,()=>handlers.setAxis(a),a));
    }else if(sel?.kind==="phone"){
      row.append(
        chip("PHONE DRIVES",workspace.drive_mode==="PHONE_DRIVES_HAND",()=>handlers.setDrive("PHONE_DRIVES_HAND"),"Phone drives hand"),
        chip("HAND DRIVES",workspace.drive_mode==="HAND_DRIVES_PHONE",()=>handlers.setDrive("HAND_DRIVES_PHONE"),"Hand drives phone"),
        chip("LOCK GRIP",workspace.drive_mode==="LOCK_GRIP",()=>handlers.setDrive("LOCK_GRIP"),"Lock grip")
      );
    }else if(sel?.kind==="body") addRepresentation(row,workspace,handlers);
    else if(sel?.kind==="arm7") row.appendChild(chip("RIGHT ARM · 7",true,()=>handlers.openNumbers?.(),"Right arm numbers"));
    else if(sel?.kind==="torso") row.appendChild(chip("TORSO · 3 BOXES",true,()=>handlers.openNumbers?.(),"Torso numbers"));
    else if(sel?.kind==="mirror") row.append(
      chip("DISTANCE",sel.id==="d_M",()=>handlers.select({kind:"mirror",id:"d_M",label:"Mirror distance"}),"Mirror distance"),
      chip("WINDOW",sel.id==="window",()=>handlers.select({kind:"mirror",id:"window",label:"Mirror window pan"}),"Mirror window pan")
    );
    else if(sel?.kind==="apparatus") row.appendChild(chip("APPARATUS PAN",true,()=>{},"Apparatus pan"));
    else if(sel?.kind==="crop"||sel?.kind==="camera") row.appendChild(chip("CROP",sel?.kind==="crop",()=>handlers.select({kind:"crop",id:"crop",label:"Crop pan"}),"Crop pan"));
    else if(sel?.kind==="reflected") row.appendChild(chip("REFLECTED",true,()=>{},"Reflected content"));

    if(workspace.output_mode==="RECURSION"&&(sel?.kind==="q"||sel?.kind==="content_q")){
      const pOk=!!proj.portal?.valid;
      row.append(
        chip("AUTO",workspace.warp==="AUTO"&&pOk,()=>handlers.setWarp("AUTO"),"AUTO warp"),
        chip("OFF",workspace.warp==="OFF",()=>handlers.setWarp("OFF"),"Warp off"),
        chip("q "+workspace.q,false,()=>handlers.nudgeQ(),"Toggle q"),
        chip("n "+workspace.n,false,()=>handlers.nudgeN(),"Cycle n")
      );
    }
  }else if(phase==="STAGE"&&sel?.kind==="phone"){
    row.appendChild(chip("PHONE WIDTH",false,()=>handlers.select({kind:"phone_width",id:"phone_width",label:"Measured phone width"}),"Measured phone width"));
  }

  if(row.childElementCount)el.appendChild(row);
}
