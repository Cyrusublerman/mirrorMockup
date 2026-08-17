export function hitScreenCorner(quad,uv,radius=.06){if(!quad)return-1;let best=-1,bestD=radius;for(let i=0;i<4;i++){const p=quad[i];if(!p)continue;const d=Math.hypot(p[0]-uv[0],p[1]-uv[1]);if(d<bestD){bestD=d;best=i;}}return best;}

export function applyScreenCorner(dispatch,transform,preview){
  const phone={translation:transform.translation.slice(),yaw:transform.yaw,pitch:transform.pitch,roll:transform.roll};
  if(preview){
    dispatch.preview("ROTATE_PHONE",phone);
    if(transform.crop_pan)dispatch.preview("PAN_OUTER_FRAME",{pan:transform.crop_pan.slice()});
    // Dependent framing compensation must not become the user-facing transaction driver.
    dispatch.preview("ROTATE_PHONE",phone);
  }else{
    dispatch.commit("ROTATE_PHONE",phone,"Drag screen corner");
    if(transform.crop_pan)dispatch.commit("PAN_OUTER_FRAME",{pan:transform.crop_pan.slice()},"Screen-corner framing compensation");
  }
}
