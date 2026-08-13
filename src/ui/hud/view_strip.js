export const EDITOR_VIEWS = ["CAMERA", "FRONT", "SIDE", "TOP", "ISO"];

export function mountViewStrip(el, workspace, onChange) {
  if (!el.dataset.ready) {
    el.replaceChildren();
    el.className = "mp-views";
    el.dataset.ready = "1";
    for (const id of EDITOR_VIEWS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mp-chip";
      b.dataset.view = id;
      b.textContent = id;
      b.setAttribute("aria-label", "Editor view " + id);
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onChange(id);
      });
      el.appendChild(b);
    }
  }
  for (const b of el.querySelectorAll(".mp-chip")) {
    const on = b.dataset.view === workspace.editor_view;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  }
}
