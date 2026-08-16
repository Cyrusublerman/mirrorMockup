import { add, cross, distance, dot, length, normalize, scale, sub } from "../../shared_math/vector.js";
import { reflectPoint } from "../reflection/reflect.js";
import { PANELS_AI } from "../../../fixtures/reference/panels_ai.js";
import { t } from "../../../fixtures/tolerances.js";
import { DEC } from "../../../fixtures/decisions.js";

export const HEAD_RADIUS_M = DEC["DEC-R"].working_hypothesis.radius_m;
export const E_FLOOR_M = t("T-FEA-E");
export const A_ELBOW_IN_M = t("T-FEA-A-ELBOW");
export const A_CROSS_BODY_M = t("T-FEA-A-CROSS");
export const A_SAME_SIDE_LIMIT_M = t("T-FEA-A-REACH");
export const E_ABDUCTION_CEILING_M = t("T-FEA-E-MAX");

function signedMargin(v){return Number.isFinite(v)?v:-Infinity;}

export class FeasibleSet {
  evaluate({face,camera,mirrorCentre,mirrorNormal,shoulder,handedness="right",r=HEAD_RADIUS_M}) {
    if(!face||!camera||!mirrorCentre||!mirrorNormal)return{inside:false,reasons:["missing_geometry"],distance_to_boundary:-Infinity,boundaries:[]};
    const n=normalize(mirrorNormal),m=Math.abs(dot(sub(face,mirrorCentre),n)),c=Math.abs(dot(sub(camera,mirrorCentre),n)),u=c-m,a=distance(camera,face),along=dot(sub(camera,face),n),eVec=sub(sub(camera,face),scale(n,along)),e=length(eVec);
    const faceR=reflectPoint(face,mirrorCentre,n),R=a>1e-9?distance(camera,faceR)/a:Infinity,toFace=sub(face,camera),toFaceR=sub(faceR,camera),denom=length(toFace)*length(toFaceR),cosSig=denom>1e-12?Math.min(1,Math.max(-1,dot(toFace,toFaceR)/denom)):1,sigma=Math.acos(cosSig),asinArg=a>1e-9?Math.min(1,r/a):1,clearance=sigma-Math.asin(asinArg);
    const eclipseLimit=(1+a/Math.max(2*m,1e-9))*r,eMin=Math.max(E_FLOOR_M,eclipseLimit),elbowInMargin=a-A_ELBOW_IN_M,reachMargin=A_SAME_SIDE_LIMIT_M-a,eclipseMargin=e-eMin,abductionMargin=E_ABDUCTION_CEILING_M-e;
    const shoulderLateral=shoulder?sub(sub(shoulder,face),scale(n,dot(sub(shoulder,face),n))):null,crossed=!!(shoulderLateral&&e>1e-9&&dot(eVec,shoulderLateral)<0),sameSideRequired=a>A_CROSS_BODY_M,sameSideOk=!sameSideRequired||!crossed,sameSideMargin=sameSideOk?Math.abs(A_CROSS_BODY_M-a):A_CROSS_BODY_M-a;
    const boundaries=[
      {id:"elbow_in",label:"elbow in",variable:"a",value:a,limit:A_ELBOW_IN_M,sense:">=",distance:elbowInMargin},
      {id:"eclipse",label:"reflection eclipse / e floor",variable:"e",value:e,limit:eMin,sense:">=",distance:eclipseMargin},
      {id:"shoulder_abduction",label:"shoulder abduction ceiling",variable:"e",value:e,limit:E_ABDUCTION_CEILING_M,sense:"<=",distance:abductionMargin},
      {id:"cross_body",label:"cross-body limit",variable:"a / handedness",value:a,limit:A_CROSS_BODY_M,sense:"same-side beyond",distance:sameSideMargin},
      {id:"reach",label:"same-side / reach limit",variable:"a",value:a,limit:A_SAME_SIDE_LIMIT_M,sense:"<=",distance:reachMargin},
    ];
    const reasons=[];if(elbowInMargin<0)reasons.push("elbow_in");if(eclipseMargin<0)reasons.push(e<E_FLOOR_M?"e_floor":"direct_head_eclipse");if(abductionMargin<0)reasons.push("shoulder_abduction");if(!sameSideOk)reasons.push("cross_body_same_side");if(reachMargin<0)reasons.push("beyond_reach");
    const bindingRow=boundaries.reduce((best,row)=>!best||signedMargin(row.distance)<signedMargin(best.distance)?row:best,null);
    return{m,u,c,a,e,R,sigma,clearance,r,r_epistemic:DEC["DEC-R"].epistemic_status,eclipseLimit,eMin,eMax:E_ABDUCTION_CEILING_M,crossed,sameSideRequired,handedness,inside:reasons.length===0,reasons,boundaries,distance_to_boundary:bindingRow?.distance??-Infinity,binding:bindingRow?.id||null};
  }
  lateralDir(face,camera,n){const along=dot(sub(camera,face),n);let lat=sub(sub(camera,face),scale(n,along));if(length(lat)<1e-6)lat=Math.abs(n[2])<.9?cross(n,[0,0,1]):cross(n,[1,0,0]);return normalize(lat);}
  project(translation,d_M,face,camera,n,row){if(row.inside)return{translation:translation.slice(),d_M,moved:false};let nextT=translation.slice();const lat=this.lateralDir(face,camera,n);if(row.e<row.eMin)nextT=add(nextT,scale(lat,row.eMin-row.e+.002));if(row.e>E_ABDUCTION_CEILING_M)nextT=add(nextT,scale(lat,-(row.e-E_ABDUCTION_CEILING_M+.002)));const radial=sub(camera,face);if(length(radial)>1e-9){const dir=normalize(radial),targetA=Math.min(A_SAME_SIDE_LIMIT_M-.002,Math.max(A_ELBOW_IN_M+.002,row.a));if(Math.abs(targetA-row.a)>1e-9)nextT=add(nextT,scale(dir,targetA-row.a));}if(row.sameSideRequired&&row.crossed)nextT=add(nextT,scale(lat,.02));return{translation:nextT,d_M,moved:true};}
  isoR(a,m,R){return R>1?(2*m)/(R-1):a;}
  referenceDots(){return Object.entries(PANELS_AI).map(([id,row])=>({id,a:row.a_m,e:row.e_m,regime:row.regime,occupancy:{mirror:row.mirror,direct_body:row.direct_body,reflected_body:row.reflected_body},epistemic:row.ae_epistemic}));}
}
