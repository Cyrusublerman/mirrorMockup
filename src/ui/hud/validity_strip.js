export function mountValidityStrip(el, proj) {
  el.className = "mp-status";
  el.replaceChildren();
  const t = document.createElement("strong");
  t.className = "mp-valid " + (proj.valid ? "ok" : "bad");
  t.textContent = proj.valid ? "PASS" : "FAIL";
  el.appendChild(t);
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = proj.valid ? "●" : "■";
  el.appendChild(icon);
  const r = document.createElement("span");
  r.textContent = proj.valid
    ? (proj.compensation ? humanCompensation(proj.compensation) : "feasible")
    : String(proj.reasons[0] || "invalid");
  el.appendChild(r);
}

export function humanCompensation(c) {
  if (!c) return "";
  if (c.variable === "mirror_distance_request_m") {
    return `Moved mirror distance ${Number(c.from).toFixed(2)} → ${Number(c.to).toFixed(2)} m to keep reflected phone size`;
  }
  return `Moved ${c.variable} (${c.reason})`;
}
