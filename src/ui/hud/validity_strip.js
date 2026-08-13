export function mountValidityStrip(el, proj) {
  el.className = "mp-valid " + (proj.valid ? "ok" : "bad");
  el.replaceChildren();
  const t = document.createElement("span");
  t.textContent = proj.valid ? "VALID" : "INVALID";
  el.appendChild(t);
  if (!proj.valid && proj.reasons[0]) {
    const r = document.createElement("span");
    r.className = "mp-muted";
    r.textContent = String(proj.reasons[0]);
    el.appendChild(r);
  }
}
