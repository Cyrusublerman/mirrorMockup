import { CATALOGUE } from "../overlays/composition_overlay_stack.js";

export function mountOverlayStrip(el, workspace, onToggle) {
  el.replaceChildren();
  el.className = "mp-row";
  for (const id of CATALOGUE) {
    if (id === "DISTORTION") continue;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mp-chip" + (workspace.overlays[id] ? " is-on" : "");
    b.textContent = id;
    b.addEventListener("click", () => onToggle(id));
    el.appendChild(b);
  }
}
