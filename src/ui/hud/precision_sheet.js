export function mountPrecisionSheet(el, open, fields, onCommit, onClose, opts = {}) {
  const persistent = !!opts.persistent;
  el.className = "mp-sheet" + (open || persistent ? " is-open" : "") + (persistent ? " is-persistent" : "");
  el.replaceChildren();
  if (!open && !persistent) return;

  const head = document.createElement("header");
  const h = document.createElement("strong");
  h.textContent = opts.title || "NUMBERS";
  head.appendChild(h);
  if (opts.frame) {
    const frame = document.createElement("button");
    frame.type = "button";
    frame.className = "mp-chip mp-frame-cycle";
    frame.textContent = `frame: ${String(opts.frame).toLowerCase()}`;
    frame.addEventListener("click", () => opts.onCycleFrame?.());
    head.appendChild(frame);
  }
  if (!persistent) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "mp-chip";
    close.textContent = "Close";
    close.addEventListener("click", onClose);
    head.appendChild(close);
  }
  el.appendChild(head);

  const form = document.createElement("form");
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const out = {};
    for (const f of fields) {
      if (f.readonly) continue;
      const field = form.elements[f.key];
      if (!field) continue;
      const n = Number(field.value);
      if (Number.isFinite(n)) out[f.key] = n;
    }
    onCommit(out);
  });
  for (const f of fields) {
    const lab = document.createElement("label");
    lab.textContent = f.label;
    const inp = document.createElement("input");
    inp.name = f.key;
    inp.type = f.type || "number";
    inp.step = f.step || "any";
    inp.value = f.value ?? "";
    if (f.readonly) {
      inp.readOnly = true;
      inp.setAttribute("aria-readonly", "true");
    }
    if (f.min != null) inp.min = String(f.min);
    if (f.max != null) inp.max = String(f.max);
    lab.appendChild(inp);
    form.appendChild(lab);
  }
  if (fields.some((f) => !f.readonly)) {
    const row = document.createElement("div");
    row.className = "mp-row";
    const go = document.createElement("button");
    go.type = "submit";
    go.className = "mp-chip is-on";
    go.textContent = "Apply";
    row.appendChild(go);
    if (!persistent) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "mp-chip";
      cancel.textContent = "Cancel";
      cancel.addEventListener("click", onClose);
      row.appendChild(cancel);
    }
    form.appendChild(row);
  }
  el.appendChild(form);
}
