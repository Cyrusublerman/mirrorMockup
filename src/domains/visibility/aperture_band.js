import { dot, sub } from "../../shared_math/vector.js";

export const PART_SPANS=Object.freeze({feet:[0,.08],shins:[.08,.28],thighs:[.28,.52],torso:[.52,.82],head:[.82,1]});

export class ApertureBand{
  evaluate({camera,face,mirror,stature=1.7}){
    const C=camera?.world?.translation,n=mirror?.basis?.n,M=mirror?.centre;if(!C||!n||!M||!face)return{parts:{},visible_band:null};
    const p=Math.abs(dot(sub(face,M),n)),c=Math.abs(dot(sub(C,M),n)),z_c=C[2],denom=c+p;
    const z_r=(z_p)=>(p*z_c+c*z_p)/Math.max(denom,1e-9);
    const z_p=(z_ref)=>(denom*z_ref-p*z_c)/Math.max(c,1e-9);
    const required_sill=p*z_c/Math.max(denom,1e-9),required_height=stature*c/Math.max(denom,1e-9),half=(mirror.height_m||0)/2,actual_sill=M[2]-half,actual_height=mirror.height_m||0,actual_top=actual_sill+actual_height;
    const bodyLo=Math.max(0,Math.min(stature,z_p(actual_sill))),bodyHi=Math.max(0,Math.min(stature,z_p(actual_top))),visible_band=[Math.min(bodyLo,bodyHi),Math.max(bodyLo,bodyHi)];
    const parts={};
    for(const[name,[lo,hi]]of Object.entries(PART_SPANS)){const z0=lo*stature,z1=hi*stature,vis0=Math.max(z0,visible_band[0]),vis1=Math.min(z1,visible_band[1]),span=Math.max(1e-9,z1-z0),visible=Math.max(0,vis1-vis0)/span;parts[name]={z0,z1,zr0:z_r(z0),zr1:z_r(z1),visible};}
    return{p,c,z_c,z_r_fn:z_r,z_p_fn:z_p,required_sill,required_height,actual_sill,actual_height,actual_top,too_high_by:actual_sill-required_sill,sill_sensitivity:p/Math.max(denom,1e-9),visible_band,cut:visible_band[0],parts};
  }
}
