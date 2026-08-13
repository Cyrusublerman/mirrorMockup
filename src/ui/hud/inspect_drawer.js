function row(k, v) {
  const d = document.createElement("div");
  d.className = "mp-kv";
  const a = document.createElement("span");
  a.textContent = k;
  const b = document.createElement("span");
  b.textContent = v;
  d.append(a, b);
  return d;
}

export function mountInspectDrawer(el, open, proj, onClose) {
  el.className = "mp-inspect" + (open ? " is-open" : "");
  el.replaceChildren();
  if (!open) return;
  const head = document.createElement("header");
  const h = document.createElement("strong");
  h.textContent = "INSPECT";
  const x = document.createElement("button");
  x.type = "button";
  x.textContent = "Close";
  x.addEventListener("click", onClose);
  head.append(h, x);
  el.appendChild(head);
  const body = document.createElement("div");
  body.className = "mp-inspect-body";
  const b = proj.build || {};
  body.appendChild(row("APP", String(b.APP)));
  body.appendChild(row("UI", String(b.UI)));
  body.appendChild(row("CORE", String(b.CORE)));
  body.appendChild(row("commit", String(b.commit || "")));
  body.appendChild(row("valid", String(proj.valid)));
  body.appendChild(row("last_edit", JSON.stringify(proj.last_edit || {})));
  const rec = proj.rec || {};
  body.appendChild(row("S", rec.S == null ? "—" : String(rec.S)));
  body.appendChild(row("alpha", rec.alpha == null ? "—" : JSON.stringify(rec.alpha)));
  const occ = proj.occlusion || {};
  body.appendChild(row("hand vis", occ.hand_visibility == null ? "—" : Number(occ.hand_visibility).toFixed(3)));
  body.appendChild(row("face vis", occ.face_visibility == null ? "—" : Number(occ.face_visibility).toFixed(3)));
  for (const [k, v] of Object.entries(proj.residuals || {})) {
    body.appendChild(row(k, Number(v).toFixed(6)));
  }
  for (const reason of proj.reasons || []) body.appendChild(row("reason", String(reason)));
  el.appendChild(body);
}
