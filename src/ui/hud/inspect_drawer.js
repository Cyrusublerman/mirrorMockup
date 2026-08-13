import { CATALOGUE } from "../overlays/composition_overlay_stack.js";
import { mountCertificateBadge } from "./certificate_badge.js";

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

export function mountInspectDrawer(el, open, proj, workspace, handlers) {
  el.className = "mp-inspect" + (open ? " is-open" : "");
  el.replaceChildren();
  if (!open) return;
  const head = document.createElement("header");
  const h = document.createElement("strong");
  h.textContent = "INSPECT";
  const x = document.createElement("button");
  x.type = "button";
  x.className = "mp-chip";
  x.textContent = "Close";
  x.addEventListener("click", handlers.close);
  head.append(h, x);
  el.appendChild(head);
  const body = document.createElement("div");
  const cert = document.createElement("div");
  mountCertificateBadge(cert, proj);
  body.appendChild(cert);
  body.appendChild(row("transaction", String(proj.effective?.transaction || "")));
  const le = proj.last_edit || {};
  body.appendChild(row("DRIVER", String(le.driver || "—")));
  body.appendChild(row("PRESERVE", (le.preserve || []).join(", ") || "—"));
  body.appendChild(row("ALLOWED_TO_MOVE", (le.allowed_to_move || []).join(", ") || "—"));
  body.appendChild(row("output_repeat", proj.rec?.output_repeat == null ? "—" : String(proj.rec.output_repeat)));
  body.appendChild(row("same-anatomy λ*", proj.effective?.composition_metrics?.same_anatomy_scale == null ? "—" : Number(proj.effective.composition_metrics.same_anatomy_scale).toFixed(4)));
  body.appendChild(row("p_log", proj.rec?.p_log ? JSON.stringify(proj.rec.p_log) : "—"));
  body.appendChild(row("p_fix", proj.rec?.p_fix ? JSON.stringify(proj.rec.p_fix) : "—"));
  body.appendChild(row("loop", String(proj.rec?.loop_state || "—")));
  body.appendChild(row("alpha", proj.rec?.alpha == null ? "—" : JSON.stringify(proj.rec.alpha)));
  body.appendChild(row("hand vis", Number(proj.occlusion?.hand_visibility || 0).toFixed(3)));
  body.appendChild(row("face vis", Number(proj.occlusion?.face_visibility || 0).toFixed(3)));
  const title = document.createElement("strong");
  title.textContent = "TARGETS";
  body.appendChild(title);
  for (const t of proj.targets || []) {
    const res = t.residual == null ? "—" : t.residual.toFixed(4);
    const band = t.residual == null ? "NONE" : t.residual <= (t.tolerance || 0) ? "IN" : "OUT";
    body.appendChild(row(
      `${t.id} · ${t.class}`,
      `tol ${t.tolerance}  res ${res}  ${band}  w ${t.weight ?? 1} (${t.weight_origin || "DEFAULT"})  ${t.frame || ""}`,
    ));
  }
  for (const reason of proj.reasons || []) body.appendChild(row("reason", String(reason)));
  const ov = document.createElement("div");
  ov.className = "mp-row";
  for (const id of CATALOGUE) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "mp-chip" + (workspace.overlays[id] ? " is-on" : "");
    chip.textContent = id;
    chip.setAttribute("aria-pressed", workspace.overlays[id] ? "true" : "false");
    chip.addEventListener("click", () => handlers.toggleOverlay(id));
    ov.appendChild(chip);
  }
  body.appendChild(ov);
  el.appendChild(body);
}
