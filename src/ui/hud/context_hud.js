function chip(label, on, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "mp-chip" + (on ? " is-on" : "");
  b.textContent = label;
  b.addEventListener("click", fn);
  return b;
}

export function mountContextHud(el, workspace, proj, handlers) {
  el.replaceChildren();
  el.className = "mp-context";
  const sel = workspace.selected;
  const title = document.createElement("div");
  title.className = "mp-sel";
  title.textContent = sel ? sel.label : "Nothing selected";
  el.appendChild(title);

  const row = document.createElement("div");
  row.className = "mp-row";

  if (workspace.room === "POSE") {
    row.appendChild(chip("PHONE DRIVES HAND", workspace.drive_mode === "PHONE_DRIVES_HAND", () => handlers.setDrive("PHONE_DRIVES_HAND")));
    row.appendChild(chip("HAND DRIVES PHONE", workspace.drive_mode === "HAND_DRIVES_PHONE", () => handlers.setDrive("HAND_DRIVES_PHONE")));
    row.appendChild(chip("LOCK GRIP", workspace.drive_mode === "LOCK_GRIP", () => handlers.setDrive("LOCK_GRIP")));
  }
  if (workspace.room === "SCENE") {
    row.appendChild(chip("d_M", sel?.id === "d_M", () => handlers.select({ kind: "mirror", id: "d_M", label: "Mirror distance" })));
    row.appendChild(chip("WINDOW", sel?.id === "window", () => handlers.select({ kind: "mirror", id: "window", label: "Mirror window" })));
    row.appendChild(chip("APERTURE", sel?.id === "aperture", () => handlers.select({ kind: "mirror", id: "aperture", label: "Aperture" })));
    row.appendChild(chip("CROP", sel?.kind === "crop", () => handlers.select({ kind: "crop", id: "crop", label: "Crop pan" })));
  }
  if (workspace.room === "RECURSION") {
    row.appendChild(chip("AUTO", workspace.warp === "AUTO", () => handlers.setWarp("AUTO")));
    row.appendChild(chip("OFF", workspace.warp === "OFF", () => handlers.setWarp("OFF")));
    row.appendChild(chip("ADVANCED", workspace.warp === "ADVANCED", () => handlers.setWarp("ADVANCED")));
    row.appendChild(chip(`q ${workspace.q}`, false, () => handlers.nudgeQ(1)));
    row.appendChild(chip(`n ${workspace.n}`, false, () => handlers.nudgeN(1)));
  }
  el.appendChild(row);

  if (sel?.kind === "joint") {
    const sem = document.createElement("div");
    sem.className = "mp-row";
    for (const a of ["BEND", "TILT", "ROTATE"]) {
      sem.appendChild(chip(a, workspace.axis === a, () => handlers.setAxis(a)));
    }
    el.appendChild(sem);
  }
}
