export const EDITOR_VIEWS = ["CAMERA", "FRONT", "SIDE", "TOP", "ISO"];

export function mountViewStrip(el, workspace, onChange) {
  el.replaceChildren();
  el.className = "mp-row";
  for (const id of EDITOR_VIEWS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mp-chip" + (workspace.editor_view === id ? " is-on" : "");
    b.textContent = id;
    b.addEventListener("click", () => onChange(id));
    el.appendChild(b);
  }
}
