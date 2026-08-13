export const PRODUCTION_ROOMS = ["POSE", "SCENE", "RECURSION"];

export function mountTopModeStrip(el, workspace, onChange) {
  if (!el.dataset.ready) {
    el.replaceChildren();
    el.className = "mp-strip";
    el.dataset.ready = "1";
    for (const id of PRODUCTION_ROOMS) {
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
  for (const b of el.querySelectorAll(".mp-room")) {
    const on = b.dataset.room === workspace.room;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  }
}
