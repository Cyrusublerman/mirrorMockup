export class ElevationPanel {
  mount(el,band,onHeight){
    el.replaceChildren();if(!band?.parts){el.hidden=true;return;}el.hidden=false;el.className="mp-diag";const h=document.createElement("strong");h.textContent="ELEVATION";el.appendChild(h);
    el.append(kv("visible band",band.visible_band?`${m(band.visible_band[0])} → ${m(band.visible_band[1])}`:"—"),kv("cut",m(band.cut)),kv("required sill",m(band.required_sill)),kv("actual sill",m(band.actual_sill)),kv("too high by",m(band.too_high_by)),kv("required height",m(band.required_height)),kv("actual height",m(band.actual_height)),kv("sill sensitivity",band.sill_sensitivity==null?"—":Number(band.sill_sensitivity).toFixed(2)+" m per m camera height"));
    if(onHeight){const lab=document.createElement("label");lab.textContent="mount height";const inp=document.createElement("input");inp.type="number";inp.step="0.01";inp.value=Number(band.actual_sill+(band.actual_height||0)/2).toFixed(3);inp.addEventListener("change",()=>onHeight(Number(inp.value)));lab.appendChild(inp);el.appendChild(lab);}
    for(const[name,p]of Object.entries(band.parts))el.appendChild(kv(name,`${Math.round((p.visible||0)*100)} %`));
  }
}
function m(v){return v==null?"—":Number(v).toFixed(3)+" m";}
function kv(k,v){const d=document.createElement("div");d.className="mp-kv";const a=document.createElement("span");a.textContent=k;const b=document.createElement("span");b.textContent=v;d.append(a,b);return d;}
