import { OUTPUT_MODES } from "../state/phase_state.js";

export class OutputRail {
  mount(el, current, onChange) {
    if (!el.dataset.ready) {
      el.replaceChildren();
      el.className = "mp-row mp-output-rail";
      el.dataset.ready = "1";
      for (const id of OUTPUT_MODES) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mp-chip";
        b.dataset.mode = id;
        b.textContent = id === "RECURSION" ? "RECURSION · synthesis" : id.replaceAll("_", " ");
        b.addEventListener("click", () => onChange(id));
        el.appendChild(b);
      }
    }
    for (const b of el.querySelectorAll(".mp-chip")) {
      const on = b.dataset.mode === current;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
}
