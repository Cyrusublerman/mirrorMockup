export function mountValidityStrip(el, proj) {
  el.className = "mp-status";
  el.replaceChildren();
  const r = document.createElement("span");
  if (proj.compensation && Math.abs(Number(proj.compensation.to) - Number(proj.compensation.from)) > 0.01) {
    r.textContent = "See compensation sheet";
  } else if (proj.valid) r.textContent = "Composition is feasible";
  else r.textContent = String(proj.reasons[0] || "Open Inspect for what failed");
  el.appendChild(r);
}

export function humanCompensation(c) {
  if (!c) return "";
  if (c.variable === "mirror_distance_request_m") {
    return `Moved mirror distance ${Number(c.from).toFixed(2)} → ${Number(c.to).toFixed(2)} m to keep reflected phone size`;
  }
  return `Moved ${c.variable} (${c.reason})`;
}
