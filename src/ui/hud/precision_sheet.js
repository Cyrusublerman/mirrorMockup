export function mountPrecisionSheet(el, open, fields, onCommit, onClose) {
  el.className = "mp-sheet" + (open ? " is-open" : "");
  el.replaceChildren();
  if (!open) return;
  const form = document.createElement("form");
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const out = {};
    for (const f of fields) {
      const n = Number(form.elements[f.key].value);
      if (Number.isFinite(n)) out[f.key] = n;
    }
    onCommit(out);
  });
  for (const f of fields) {
    const lab = document.createElement("label");
    lab.textContent = f.label;
    const inp = document.createElement("input");
    inp.name = f.key;
    inp.type = "number";
    inp.step = f.step || "any";
    inp.value = f.value;
    lab.appendChild(inp);
    form.appendChild(lab);
  }
  const row = document.createElement("div");
  row.className = "mp-row";
  const go = document.createElement("button");
  go.type = "submit";
  go.textContent = "Apply";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", onClose);
  row.append(go, cancel);
  form.appendChild(row);
  el.appendChild(form);
}
