import { CATALOGUE } from "../overlays/composition_overlay_stack.js";
import { mountCertificateBadge } from "./certificate_badge.js";

const LOCKS = [
  ["SUPPORT", "SUPPORT"],
  ["REFLECTED_BODY_SCALE", "REFLECTED BODY SCALE"],
  ["PHONE_AREA", "PHONE AREA"],
  ["MIRROR_OCCUPANCY", "MIRROR OCCUPANCY"],
  ["GRIP", "GRIP"],
  ["P_VALID", "P VALID"],
];

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
  body.appendChild(row("status", String(proj.effective?.transaction === "PROJECTED" ? "PROJECTED" : (proj.valid ? "PASS" : "FAIL"))));
  const le = proj.last_edit || {};
  body.appendChild(row("DRIVER", String(le.driver || "—")));
  body.appendChild(row("PRESERVE", (le.preserve || []).join(", ") || "—"));
  body.appendChild(row("ALLOWED_TO_MOVE", (le.allowed_to_move || []).join(", ") || "—"));
  body.appendChild(row("output_repeat", proj.rec?.output_repeat == null ? "—" : String(proj.rec.output_repeat)));
  body.appendChild(row("same-anatomy λ*", proj.effective?.composition_metrics?.same_anatomy_scale == null ? "—" : Number(proj.effective.composition_metrics.same_anatomy_scale).toFixed(4)));
  const gap = proj.effective?.composition_metrics?.gap_residual;
  body.appendChild(row("head–phone gap", gap == null ? "—" : Number(gap).toFixed(4)));
  const dh = (proj.targets || []).find((t) => t.id === "direct_head" || t.id === "target_direct_head");
  body.appendChild(row(
    "target_direct_head",
    dh ? `res ${dh.residual == null ? "—" : Number(dh.residual).toFixed(4)}  ${dh.residual == null ? "NONE" : dh.residual <= (dh.tolerance || 0) ? "IN" : "OUT"}` : "—",
  ));
  body.appendChild(row("p_log", proj.rec?.p_log ? JSON.stringify(proj.rec.p_log) : "—"));
  body.appendChild(row("p_fix", proj.rec?.p_fix ? JSON.stringify(proj.rec.p_fix) : "—"));
  body.appendChild(row("loop", String(proj.rec?.loop_state || "—")));
  body.appendChild(row("alpha", proj.rec?.alpha == null ? "—" : JSON.stringify(proj.rec.alpha)));
  body.appendChild(row("hand vis", Number(proj.occlusion?.hand_visibility || 0).toFixed(3)));
  body.appendChild(row("face vis", Number(proj.occlusion?.face_visibility || 0).toFixed(3)));
  if (proj.feasible) {
    body.appendChild(row("feasible", proj.feasible.inside ? "inside" : (proj.feasible.binding || "out")));
    body.appendChild(row("a / e / R", `${Number(proj.feasible.a || 0).toFixed(3)} / ${Number(proj.feasible.e || 0).toFixed(3)} / ${Number(proj.feasible.R || 0).toFixed(2)}`));
  }
  if (proj.arm_seven) {
    body.appendChild(row("7-DOF r/θ/φ", `${Number(proj.arm_seven.r).toFixed(3)} / ${Number(proj.arm_seven.theta).toFixed(3)} / ${Number(proj.arm_seven.phi).toFixed(3)}`));
  }
  if (proj.phone_scale != null) body.appendChild(row("phone scale f", Number(proj.phone_scale).toFixed(4)));
  if (proj.mask) body.appendChild(row("mask panel", `${proj.mask.panel} IoU ${Number(proj.mask.weighted).toFixed(3)}`));
  if (proj.epistemic) {
    body.appendChild(row("epistemic cam/body", `${proj.epistemic.camera} / ${proj.epistemic.body}`));
  }
  if (proj.screen_gates) {
    for (const [k, g] of Object.entries(proj.screen_gates)) {
      body.appendChild(row("P " + k, g.ok ? "ok" : "fail"));
    }
  }
  const intentTitle = document.createElement("strong");
  intentTitle.textContent = "OCCLUSION INTENT";
  body.appendChild(intentTitle);
  const intentRow = document.createElement("div");
  intentRow.className = "mp-row";
  const intents = proj.requested?.composition?.occlusion_intent || {};
  for (const [id, rule] of Object.entries(intents)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "mp-chip";
    chip.textContent = id.replaceAll("_", " ") + " " + (rule.state || "");
    chip.addEventListener("click", () => handlers.cycleIntent?.(id, rule));
    intentRow.appendChild(chip);
  }
  body.appendChild(intentRow);
  const lockTitle = document.createElement("strong");
  lockTitle.textContent = "LOCKS";
  body.appendChild(lockTitle);
  const lockRow = document.createElement("div");
  lockRow.className = "mp-row";
  const onLocks = proj.requested?.composition?.locks || {};
  for (const [id, label] of LOCKS) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "mp-chip" + (onLocks[id] ? " is-on" : "");
    chip.textContent = label;
    chip.setAttribute("aria-pressed", onLocks[id] ? "true" : "false");
    chip.addEventListener("click", () => handlers.toggleLock(id));
    lockRow.appendChild(chip);
  }
  body.appendChild(lockRow);
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
