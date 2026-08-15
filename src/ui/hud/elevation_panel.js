export class ElevationPanel {
  mount(el, band) {
    el.replaceChildren();
    if (!band?.parts) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.className = "mp-diag";
    const h = document.createElement("strong");
    h.textContent = "ELEVATION";
    el.appendChild(h);
    el.append(
      kv("required sill", m(band.required_sill)),
      kv("actual sill", m(band.actual_sill)),
      kv("too high by", m(band.too_high_by)),
      kv("required height", m(band.required_height)),
      kv("actual height", m(band.actual_height)),
    );
    for (const [name, p] of Object.entries(band.parts)) {
      el.appendChild(kv(name, `${Math.round((p.visible || 0) * 100)} %`));
    }
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
