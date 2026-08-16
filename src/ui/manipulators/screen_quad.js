export function hitScreenCorner(quad,uv,radius=.06){if(!quad)return-1;let best=-1,bestD=radius;for(let i=0;i<4;i++){const p=quad[i];if(!p)continue;const d=Math.hypot(p[0]-uv[0],p[1]-uv[1]);if(d<bestD){bestD=d;best=i;}}return best;}

export function applyScreenCorner(dispatch,transform,preview){
  const phone={translation:transform.translation.slice(),yaw:transform.yaw,pitch:transform.pitch,roll:transform.roll};
  if(preview){
    dispatch.preview("ROTATE_PHONE",phone);
    if(transform.mirror_pan_uv)dispatch.preview("PAN_MIRROR_WINDOW",{uv:transform.mirror_pan_uv.slice()});
    // Re-tag the transaction with the user-facing P/phone driver after the dependent mirror compensation.
    dispatch.preview("ROTATE_PHONE",phone);
  }else{
    dispatch.commit("ROTATE_PHONE",phone,"Drag screen corner");
    if(transform.mirror_pan_uv)dispatch.commit("PAN_MIRROR_WINDOW",{uv:transform.mirror_pan_uv.slice()},"Screen-corner compensation");
  }
}
