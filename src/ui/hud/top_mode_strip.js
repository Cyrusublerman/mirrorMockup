export const PRODUCTION_ROOMS = ["POSE", "SCENE", "RECURSION"];

const ROOMS = PRODUCTION_ROOMS.map((id) => ({ id, label: id }));

export function mountTopModeStrip(el, workspace, onChange) {
  el.replaceChildren();
  el.className = "mp-strip";
  for (const room of ROOMS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mp-room" + (workspace.room === room.id ? " is-on" : "");
    b.textContent = room.label;
    b.addEventListener("click", () => onChange(room.id));
    el.appendChild(b);
  }
}
