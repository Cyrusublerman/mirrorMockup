import { PANELS_AI } from "../../../fixtures/reference/panels_ai.js";

export class FeasiblePanel {
  dots() {
    return Object.entries(PANELS_AI).map(([id, row]) => ({
      id,
      a: row.a_m,
      e: row.e_m,
      regime: row.regime,
    }));
  }

  mount(el, fea, dots = this.dots()) {
    el.replaceChildren();
    if (!fea) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.className = "mp-diag";
    const h = document.createElement("strong");
    h.textContent = "FEASIBLE";
    el.appendChild(h);
    el.append(
      kv("a", m(fea.a)),
      kv("e", m(fea.e)),
      kv("R", fea.R == null ? "—" : Number(fea.R).toFixed(2)),
      kv("clearance", fea.clearance == null ? "—" : ((fea.clearance * 180) / Math.PI).toFixed(2) + "°"),
      kv("inside", fea.inside ? "yes" : "no"),
      kv("boundary", fea.distance_to_boundary == null ? "—" : Number(fea.distance_to_boundary).toFixed(3) + " m"),
      kv("binds", fea.binding || "—"),
    );
    const map = document.createElement("div");
    map.className = "mp-fea-map";
    map.setAttribute("aria-label", "A–I on a–e plane");
    const band = document.createElement("span");
    band.className = "mp-fea-band";
    band.title = "eclipse / e-floor";
    map.appendChild(band);
    for (const d of dots) {
      const dot = document.createElement("span");
      dot.className = "mp-fea-dot";
      dot.dataset.panel = d.id;
      dot.style.left = `${clamp01((d.a - 0.2) / 0.5) * 100}%`;
      dot.style.bottom = `${clamp01((d.e - 0.05) / 0.3) * 100}%`;
      dot.title = `${d.id} ${d.regime}`;
      map.appendChild(dot);
    }
    if (fea.a != null && fea.e != null) {
      const here = document.createElement("span");
      here.className = "mp-fea-dot is-here";
      here.style.left = `${clamp01((fea.a - 0.2) / 0.5) * 100}%`;
      here.style.bottom = `${clamp01((fea.e - 0.05) / 0.3) * 100}%`;
      here.title = "you are here";
      map.appendChild(here);
    }
    el.appendChild(map);
  }
}

function m(v) {
  return v == null ? "—" : Number(v).toFixed(3) + " m";
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

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
