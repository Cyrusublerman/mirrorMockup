const HOLLOW = new Set(["HYPOTHESIS", "PROVISIONAL", "UNMEASURED", "UNRESOLVED", "ASSUMED"]);
const SOLID = new Set(["MEASURED", "CALIBRATED", "DECLARED"]);

export class StagingPrescription {
  classify(status) {
    const s=String(status||"HYPOTHESIS").toUpperCase();
    if(SOLID.has(s))return"solid";
    if(s==="DERIVED")return"derived";
    return HOLLOW.has(s)?"hollow":"hollow";
  }

  build(requested,effective) {
    const widthStatus=requested.phone?.width_epistemic||"ASSUMED";
    const scaleSolid=this.classify(widthStatus)==="solid";
    const scaleDerivedStatus=scaleSolid?"DERIVED":"HYPOTHESIS";
    const faceZ=effective.skeleton?.fk?.head?.[2];
    const camZ=effective.camera?.world?.translation?.[2];
    const distances=[
      {id:"stand_m",value:effective.feasible?.m??effective.apparatus?.d_M,status:scaleDerivedStatus},
      {id:"phone_forward_m",value:effective.feasible?.u,status:scaleDerivedStatus},
      {id:"phone_lateral_m",value:effective.feasible?.e,status:scaleDerivedStatus},
      {id:"phone_above_eye_m",value:Number.isFinite(faceZ)&&Number.isFinite(camZ)?camZ-faceZ:null,status:scaleDerivedStatus},
      {id:"phone_width_m",value:requested.phone?.body_dimensions_m?.width,status:widthStatus},
    ];
    const printed=distances.map((d)=>({...d,mark:this.classify(d.status)}));
    const hollow=printed.filter((d)=>d.mark==="hollow"||d.value==null||!Number.isFinite(d.value));
    const rootYaw=requested.body?.pose_targets?.root?.yaw||0;
    const card={
      stand_m:effective.feasible?.m,
      turn_deg:((rootYaw-Math.PI)*180)/Math.PI,
      phone_forward_m:effective.feasible?.u,
      phone_above_eye_m:Number.isFinite(faceZ)&&Number.isFinite(camZ)?camZ-faceZ:null,
      phone_lateral_m:effective.feasible?.e,
      hold:"right hand, same side",
      lens:requested.camera?.topology_request==="CAMERA_BETWEEN"?"declared camera-between":"front, 1x",
      weight:(requested.body?.support_request?.contacts||[]).join(" + ")||"both feet",
    };
    return {
      refused:hollow.length>0,
      hollow:hollow.map((d)=>d.id),
      printed,
      card,
      topology:requested.camera?.topology_request||"FRONT_CAMERA_SELFIE",
      topology_epistemic:requested.camera?.topology_epistemic||"UNRESOLVED",
      scale_root:{phone_width_m:requested.phone?.body_dimensions_m?.width,status:widthStatus},
      synthesis:true,
    };
  }
}
