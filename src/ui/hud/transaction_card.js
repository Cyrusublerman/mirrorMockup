export class TransactionCard {
  mount(el, proj, handlers = {}) {
    el.replaceChildren();
    const le = proj.last_edit;
    const comp = proj.transaction_compensation || proj.compensation;
    const fea = proj.feasible;
    const intent = proj.occlusion_intent;
    const show = !!(le || comp || proj.effective?.transaction === "PROJECTED" || proj.effective?.transaction === "FAIL");
    if (!show) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.className = "mp-comp mp-txn";
    el.append(
      kv("DRIVER", String(le?.driver || le?.action || "—")),
      kv("PRESERVE", list(le?.preserve || proj.effective?.preserve)),
      kv("ALLOWED TO MOVE", list(le?.allowed_to_move || proj.effective?.allowed_to_move)),
      kv("DERIVED", derivedLine(fea, proj)),
      kv("RESULT", resultLine(comp, proj)),
      kv("FAILURE", failureLine(proj, intent)),
    );
    if (comp) {
      const row = document.createElement("div");
      row.className = "mp-row";
      row.append(
        chip("KEEP " + fmt(comp.to), handlers.accept || proj.transaction_actions?.keep),
        chip("RELEASE LOCK", handlers.release || proj.transaction_actions?.release),
        chip("REVERT", handlers.revert || proj.transaction_actions?.revert),
      );
      el.appendChild(row);
    }
  }
}

function list(v) {
  if (!v || !v.length) return "—";
  return v.join(" · ");
}

function fmt(v) {
  return Number.isFinite(v) ? Number(v).toFixed(2) : "—";
}

function derivedLine(fea, proj) {
  const bits = [];
  if (fea?.R != null) bits.push("R " + Number(fea.R).toFixed(2));
  if (fea?.e != null) bits.push("e " + Number(fea.e).toFixed(3) + " m");
  if (proj.aperture_band?.too_high_by != null) bits.push("sill " + Number(proj.aperture_band.too_high_by).toFixed(3) + " m");
  return bits.join(" · ") || "—";
}

function resultLine(comp, proj) {
  if (comp && Number.isFinite(comp.from) && Number.isFinite(comp.to)) return `requested ${fmt(comp.from)} m → effective ${fmt(comp.to)} m`;
  return String(proj.effective?.transaction || "—");
}

function failureLine(proj, intent) {
  if (intent && !intent.ok) return "REQUIRED under · " + (intent.violations || []).join(", ");
  if (proj.feasible && !proj.feasible.inside) return proj.feasible.binding || (proj.feasible.reasons || [])[0] || "infeasible";
  return (proj.reasons || [])[0] || "—";
}

function kv(k, v) {
  const d = document.createElement("div");
  d.className = "mp-kv";
  const a = document.createElement("span");
  a.textContent = k;
  const b = document.createElement("span");
  b.textContent = v;
  d.append(a, b);
  return d;
}

function chip(label, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "mp-chip";
  b.textContent = label;
  if (fn) b.addEventListener("click", fn);
  return b;
}
