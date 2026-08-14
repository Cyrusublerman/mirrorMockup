import { humanCompensation } from "./validity_strip.js";

export class CompensationSheet {
  mount(el, compensation, handlers) {
    el.replaceChildren();
    const delta = compensation ? Math.abs(Number(compensation.to) - Number(compensation.from)) : 0;
    if (!compensation || !(delta > 0.01)) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.className = "mp-comp";
    const title = document.createElement("strong");
    title.textContent = "COMPENSATION";
    const req = document.createElement("div");
    req.className = "mp-kv";
    req.append(span("requested"), span(fmt(compensation.from)));
    const eff = document.createElement("div");
    eff.className = "mp-kv";
    eff.append(span("effective"), span(fmt(compensation.to)));
    const why = document.createElement("div");
    why.className = "mp-kv";
    why.append(span("reason"), span(humanCompensation(compensation) || String(compensation.reason || "")));
    const row = document.createElement("div");
    row.className = "mp-row";
    row.append(
      chip("ACCEPT", () => handlers.accept()),
      chip("RELEASE CONSTRAINT", () => handlers.release()),
      chip("REVERT", () => handlers.revert()),
    );
    el.append(title, req, eff, why, row);
  }
}

function span(t) {
  const s = document.createElement("span");
  s.textContent = t;
  return s;
}

function fmt(v) {
  return Number.isFinite(v) ? Number(v).toFixed(4) : String(v ?? "—");
}

function chip(label, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "mp-chip";
  b.textContent = label;
  b.addEventListener("click", fn);
  return b;
}
