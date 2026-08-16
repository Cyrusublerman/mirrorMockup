export const INPUT_MODES = Object.freeze(["VIEWPORT", "NUMBERS", "PLAN", "ELEVATION", "FEASIBLE"]);

export class InputModeStrip {
  mount(el, current, onChange) {
    if (!el.dataset.ready) {
      el.replaceChildren();
      el.className = "mp-row mp-input-modes";
      el.dataset.ready = "1";
      for (const id of INPUT_MODES) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mp-chip";
        b.dataset.mode = id;
        b.textContent = id;
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
