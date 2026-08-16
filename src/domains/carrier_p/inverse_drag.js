import { evaluatePhone } from "../phone/prism.js";
import { evaluateCamera } from "../camera/model.js";
import { evaluateApparatus } from "../apparatus/relation.js";
import { evaluateMirror } from "../mirror/mesh.js";
import { ScreenQuad } from "./screen_quad.js";

const sq=new ScreenQuad();
function projectCorner(requested,index,x=null){const req=structuredClone(requested);if(x)setX(req,x);const phone=evaluatePhone(req),cam=evaluateCamera(phone.world,req),apparatus=evaluateApparatus(cam,req),mirror=evaluateMirror(apparatus,req),p=sq.evaluate(phone,cam,mirror);return p.quad?.[index]||null;}
function getX(req){const p=req.phone.transform_request;return[p.translation[0],p.translation[1],p.translation[2],p.yaw||0,p.pitch||0,p.roll||0];}
function setX(req,x){req.phone.transform_request.translation=x.slice(0,3);req.phone.transform_request.yaw=x[3];req.phone.transform_request.pitch=x[4];req.phone.transform_request.roll=x[5];}
function residual(p,target){return p?Math.hypot(p[0]-target[0],p[1]-target[1]):Infinity;}
function score(requested,index,target,x){return residual(projectCorner(requested,index,x),target);}

function coordinateRefine(requested,index,target,x){
  let best=x.slice(),bestR=score(requested,index,target,best);
  let steps=[.04,.05,.04,.08,.08,.08];
  for(let pass=0;pass<28&&bestR>1e-5;pass++){
    let improved=false;
    for(let j=0;j<6;j++){
      let local=best,localR=bestR;
      for(const mul of[-2,-1,-.5,.5,1,2]){const q=best.slice();q[j]+=steps[j]*mul;const r=score(requested,index,target,q);if(r<localR){local=q;localR=r;}}
      if(localR<bestR-1e-10){best=local;bestR=localR;improved=true;}
    }
    if(!improved)steps=steps.map((s)=>s*.5);else steps=steps.map((s)=>s*.82);
    if(Math.max(...steps)<1e-6)break;
  }
  return best;
}

export function solveScreenCornerTransform(requested,index,targetUv,iterations=18){
  if(!(index>=0&&index<4)||!targetUv)throw new Error("screen corner solve requires a corner index and target UV");
  let x=getX(requested);const h=[5e-4,5e-4,5e-4,8e-4,8e-4,8e-4],winv=[.65,.45,.65,1,1,1];let lambda=1e-7;
  for(let it=0;it<iterations;it++){
    const p=projectCorner(requested,index,x);if(!p)break;const err=[targetUv[0]-p[0],targetUv[1]-p[1]],r0=Math.hypot(err[0],err[1]);if(r0<1e-5)break;
    const J=[new Array(6).fill(0),new Array(6).fill(0)];for(let j=0;j<6;j++){const xp=x.slice(),xm=x.slice();xp[j]+=h[j];xm[j]-=h[j];const pp=projectCorner(requested,index,xp),pm=projectCorner(requested,index,xm);if(!pp||!pm)continue;J[0][j]=(pp[0]-pm[0])/(2*h[j]);J[1][j]=(pp[1]-pm[1])/(2*h[j]);}
    let a00=lambda,a01=0,a11=lambda;for(let j=0;j<6;j++){const w=winv[j];a00+=J[0][j]*w*J[0][j];a01+=J[0][j]*w*J[1][j];a11+=J[1][j]*w*J[1][j];}const det=a00*a11-a01*a01;if(Math.abs(det)<1e-15){lambda*=10;continue;}
    const y0=(a11*err[0]-a01*err[1])/det,y1=(-a01*err[0]+a00*err[1])/det,dx=new Array(6);for(let j=0;j<6;j++){dx[j]=winv[j]*(J[0][j]*y0+J[1][j]*y1);const lim=j<3?.12:.25;dx[j]=Math.max(-lim,Math.min(lim,dx[j]));}
    let best=x,bestR=r0;for(const s of[1,.5,.25,.125,.0625]){const q=x.map((v,j)=>v+s*dx[j]),r=score(requested,index,targetUv,q);if(r<bestR){best=q;bestR=r;}}if(best===x){lambda*=10;continue;}x=best;lambda=Math.max(1e-10,lambda*.25);
  }
  if(score(requested,index,targetUv,x)>1e-4)x=coordinateRefine(requested,index,targetUv,x);
  const finalUv=projectCorner(requested,index,x);
  return{translation:x.slice(0,3),yaw:x[3],pitch:x[4],roll:x[5],corner:index,target_uv:targetUv.slice(),achieved_uv:finalUv,residual:residual(finalUv,targetUv)};
}
