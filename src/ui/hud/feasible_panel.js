import { PANELS_AI } from "../../../fixtures/reference/panels_ai.js";
import { t } from "../../../fixtures/tolerances.js";

const A_ELBOW_IN_M=t("T-FEA-A-ELBOW");
const A_CROSS_BODY_M=t("T-FEA-A-CROSS");
const A_SAME_SIDE_LIMIT_M=t("T-FEA-A-REACH");
const E_ABDUCTION_CEILING_M=t("T-FEA-E-MAX");

export class FeasiblePanel {
  dots(){return Object.entries(PANELS_AI).map(([id,row])=>({id,a:row.a_m,e:row.e_m,regime:row.regime}));}
  mount(el,fea,dots=this.dots(),onBoundary=null){
    el.replaceChildren();if(!fea){el.hidden=true;return;}el.hidden=false;el.className="mp-diag mp-feasible";const h=document.createElement("strong");h.textContent="FEASIBLE";el.appendChild(h);
    el.append(kv("a",m(fea.a)),kv("e",m(fea.e)),kv("R",fea.R==null?"—":Number(fea.R).toFixed(2)),kv("clearance",fea.clearance==null?"—":((fea.clearance*180)/Math.PI).toFixed(2)+"° · "+(fea.r_epistemic||"")),kv("inside",fea.inside?"yes":"no"),kv("nearest boundary",fea.binding||"—"),kv("distance",fea.distance_to_boundary==null?"—":Number(fea.distance_to_boundary).toFixed(3)+" m"));
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 500 320");svg.classList.add("mp-fea-svg");const X=(a)=>44+((a-.2)/.5)*420,Y=(e)=>282-(e/.32)*246;
    const path=(d,cls)=>{const p=document.createElementNS(svg.namespaceURI,"path");p.setAttribute("d",d);p.setAttribute("class",cls);svg.appendChild(p);return p;};
    const line=(x1,y1,x2,y2,cls,id,label)=>{const n=document.createElementNS(svg.namespaceURI,"line");for(const[k,v]of Object.entries({x1,y1,x2,y2}))n.setAttribute(k,String(v));n.setAttribute("class",cls);if(id){n.dataset.boundary=id;n.setAttribute("tabindex","0");n.setAttribute("role","button");n.setAttribute("aria-label",label||id);const hit=()=>onBoundary?.({id,label:label||id});n.addEventListener("click",hit);n.addEventListener("keydown",(ev)=>{if(ev.key==="Enter"||ev.key===" ")hit();});}svg.appendChild(n);return n;};
    const samples=[];for(let a=.2;a<=.7001;a+=.025){const eMin=Math.max(fea.r?(1+a/Math.max(2*(fea.m||1.2),1e-9))*fea.r:t("T-FEA-E"),t("T-FEA-E"));samples.push([X(a),Y(eMin)]);}path(samples.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" "),"mp-fea-eclipse");
    line(X(A_ELBOW_IN_M),Y(0),X(A_ELBOW_IN_M),Y(.32),"mp-fea-boundary","elbow_in","elbow in · move a");line(X(A_CROSS_BODY_M),Y(0),X(A_CROSS_BODY_M),Y(.32),"mp-fea-boundary","cross_body","cross-body limit · change handedness or a");line(X(A_SAME_SIDE_LIMIT_M),Y(0),X(A_SAME_SIDE_LIMIT_M),Y(.32),"mp-fea-boundary is-hard","reach","same-side reach limit · move a");line(X(.2),Y(E_ABDUCTION_CEILING_M),X(.7),Y(E_ABDUCTION_CEILING_M),"mp-fea-boundary","shoulder_abduction","shoulder abduction ceiling · move e");
    for(const R of[9,7,5.8]){const a=(2*(fea.m||1.2))/(R-1);if(a>=.2&&a<=.7)line(X(a),Y(0),X(a),Y(.32),"mp-fea-iso");}
    for(const d of dots){const c=document.createElementNS(svg.namespaceURI,"circle");c.setAttribute("cx",String(X(d.a)));c.setAttribute("cy",String(Y(d.e)));c.setAttribute("r","4");c.setAttribute("class","mp-fea-ref");const title=document.createElementNS(svg.namespaceURI,"title");title.textContent=`${d.id} · ${d.regime}`;c.appendChild(title);svg.appendChild(c);}if(fea.a!=null&&fea.e!=null){const here=document.createElementNS(svg.namespaceURI,"circle");here.setAttribute("cx",String(X(fea.a)));here.setAttribute("cy",String(Y(fea.e)));here.setAttribute("r","6");here.setAttribute("class","mp-fea-here");svg.appendChild(here);}el.appendChild(svg);
    const boundaries=document.createElement("div");boundaries.className="mp-row mp-boundary-row";for(const b of fea.boundaries||[]){const btn=document.createElement("button");btn.type="button";btn.className="mp-chip"+(b.id===fea.binding?" is-on":"");btn.textContent=b.label;btn.addEventListener("click",()=>onBoundary?.(b));boundaries.appendChild(btn);}el.appendChild(boundaries);
  }
}
function m(v){return v==null?"—":Number(v).toFixed(3)+" m";}function kv(k,v){const d=document.createElement("div");d.className="mp-kv";const a=document.createElement("span");a.textContent=k;const b=document.createElement("span");b.textContent=v;d.append(a,b);return d;}
