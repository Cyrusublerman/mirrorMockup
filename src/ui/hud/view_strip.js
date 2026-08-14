import { EDITOR_VIEWS } from "../state/view_state.js";
export { EDITOR_VIEWS };

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
  const current = workspace.viewState?.editor_view || workspace.editor_view;
  for (const b of el.querySelectorAll(".mp-chip")) {
    const on = b.dataset.view === current;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  }
}
