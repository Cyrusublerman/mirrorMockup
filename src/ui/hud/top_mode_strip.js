import { PHASES } from "../state/phase_state.js";

export const PRODUCTION_ROOMS = PHASES;

export function mountTopModeStrip(el, workspace, onChange) {
  if (!el.dataset.ready) {
    el.replaceChildren();
    el.className = "mp-strip";
    el.dataset.ready = "1";
    for (const id of PHASES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mp-room";
      b.dataset.room = id;
      b.textContent = id;
      b.setAttribute("aria-label", id);
      b.addEventListener("click", () => onChange(id));
      el.appendChild(b);
    }
  }
  const current = workspace.phaseState?.phase || workspace.room;
  for (const b of el.querySelectorAll(".mp-room")) {
    const on = b.dataset.room === current;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  }
}
