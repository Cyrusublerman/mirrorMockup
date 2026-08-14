export function mountValidityStrip(el, proj) {
  el.className = "mp-status";
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
  r.textContent = tx === "PASS"
    ? (proj.compensation ? humanCompensation(proj.compensation) : "feasible")
    : String(proj.reasons[0] || (tx === "PROJECTED" ? "projected" : "invalid"));
  el.appendChild(r);
}

export function humanCompensation(c) {
  if (!c) return "";
  if (c.variable === "mirror_distance_request_m") {
    return `Moved mirror distance ${Number(c.from).toFixed(2)} → ${Number(c.to).toFixed(2)} m to keep reflected phone size`;
  }
  return `Moved ${c.variable} (${c.reason})`;
}
