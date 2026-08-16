const HUMAN = Object.freeze({
  elbow_in:"Phone is too close to the face for the elbow-in limit",
  e_floor:"Move the camera farther sideways to clear the face",
  direct_head_eclipse:"Direct head blocks the required mirror path",
  shoulder_abduction:"Camera is beyond the shoulder-abduction limit",
  cross_body_same_side:"Camera crosses the body beyond the cross-body limit",
  beyond_reach:"Phone is beyond reachable arm length",
  target_direct_head:"Direct head is outside its composition target",
  target_reflected_body:"Reflected body is outside its composition target",
  target_reflected_phone:"Reflected phone is outside its composition target",
  P_INVALID:"The physical phone screen carrier is not valid from this camera",
});

function humanReason(proj,tx){
  if(proj.compensation)return humanCompensation(proj.compensation);
  const binding=proj.feasible?.binding;
  if(binding&&HUMAN[binding])return HUMAN[binding];
  const reason=String((proj.reasons||[])[0]||"");
  if(HUMAN[reason])return HUMAN[reason];
  if(reason.startsWith("target_"))return "A composition target is outside its tolerance";
  if(tx==="PROJECTED")return "Adjusted to the nearest feasible state";
  if(tx==="FAIL")return "The requested state is not physically valid";
  return "feasible";
}

export function mountValidityStrip(el, proj) {
  el.className = "mp-valid-wrap mp-status";
  el.replaceChildren();
  const tx = proj.effective?.transaction || (proj.valid ? "PASS" : "FAIL");
  const t = document.createElement("strong");
  t.className = "mp-valid " + (tx === "PASS" ? "ok" : tx === "PROJECTED" ? "warn" : "bad");
  t.textContent = tx;
  el.appendChild(t);
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = tx === "PASS" ? "●" : tx === "PROJECTED" ? "▲" : "■";
  el.appendChild(icon);
  const r = document.createElement("span");
  r.textContent = humanReason(proj,tx);
  el.appendChild(r);
}

export function humanCompensation(c) {
  if (!c) return "";
  if (c.variable === "mirror_distance_request_m") {
    return `Mirror ${Number(c.from).toFixed(2)} → ${Number(c.to).toFixed(2)} m to preserve reflected phone size`;
  }
  return `Adjusted ${String(c.variable||"a dependent value").replaceAll("_"," ")} to preserve the active relationship`;
}
