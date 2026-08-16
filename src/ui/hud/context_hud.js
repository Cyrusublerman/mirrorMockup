function chip(label, on, fn, name) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "mp-chip" + (on ? " is-on" : "");
  b.textContent = label;
  b.setAttribute("aria-pressed", on ? "true" : "false");
  if (name) b.setAttribute("aria-label", name);
  b.addEventListener("click", fn);
  return b;
}

export function mountContextHud(el, workspace, proj, handlers) {
  el.replaceChildren();
  const title = document.createElement("div");
  title.className = "mp-sel";
  title.textContent = workspace.selected ? workspace.selected.label : "Tap the figure, phone or mirror";
  el.appendChild(title);

  const row = document.createElement("div");
  row.className = "mp-row";
  const sel = workspace.selected;

  if (workspace.room === "POSE") {
    row.appendChild(chip("PHONE DRIVES", workspace.drive_mode === "PHONE_DRIVES_HAND", () => handlers.setDrive("PHONE_DRIVES_HAND"), "Phone drives hand"));
    row.appendChild(chip("HAND DRIVES", workspace.drive_mode === "HAND_DRIVES_PHONE", () => handlers.setDrive("HAND_DRIVES_PHONE"), "Hand drives phone"));
    row.appendChild(chip("LOCK GRIP", workspace.drive_mode === "LOCK_GRIP", () => handlers.setDrive("LOCK_GRIP"), "Lock grip"));
    row.appendChild(chip("RELAX GRIP", false, () => handlers.relaxGrip(), "Propose relax grip"));
    if (sel?.kind === "joint" && !["wrist_R", "wrist_L", "head", "ankle_L", "ankle_R"].includes(sel.id)) {
      for (const a of ["BEND", "TILT", "ROTATE"]) {
        row.appendChild(chip(a, workspace.axis === a, () => handlers.setAxis(a), a));
      }
    }
  }
  const locks = document.createElement("div");
  locks.className = "mp-row";
  const lockIds = [
    ["PHONE_AREA", "PHONE AREA"],
    ["REFLECTED_BODY_SCALE", "REFLECTED BODY SCALE"],
    ["MIRROR_OCCUPANCY", "MIRROR OCCUPANCY"],
    ["SUPPORT", "SUPPORT"],
    ["GRIP", "GRIP"],
    ["P_VALID", "P VALID"],
  ];
  const onLocks = proj.requested?.composition?.locks || {};
  for (const [id, label] of lockIds) {
    locks.appendChild(chip(label, !!onLocks[id], () => handlers.toggleLock(id), label));
  }
  if (workspace.room === "POSE" || workspace.room === "SCENE") {
    row.appendChild(chip("OPACITY", false, () => handlers.cycleOpacity(), "Reference opacity"));
  }
  if (workspace.room === "SCENE") {
    row.appendChild(chip("d_M", sel?.id === "d_M", () => handlers.select({ kind: "mirror", id: "d_M", label: "Mirror distance" }), "Mirror distance"));
    row.appendChild(chip("WINDOW", sel?.id === "window", () => handlers.select({ kind: "mirror", id: "window", label: "Mirror window pan" }), "Pan mirror window"));
    row.appendChild(chip("APPARATUS", sel?.id === "apparatus", () => handlers.select({ kind: "apparatus", id: "apparatus", label: "Apparatus pan" }), "Pan apparatus"));
    row.appendChild(chip("CROP", sel?.kind === "crop", () => handlers.select({ kind: "crop", id: "crop", label: "Crop pan" }), "Pan crop"));
    row.appendChild(chip("REFLECTED", sel?.id === "reflected", () => handlers.select({ kind: "reflected", id: "reflected", label: "Pan reflected content" }), "Pan reflected content"));
  }
  if (workspace.room === "RECURSION") {
    const pOk = !!proj.portal?.valid;
    row.appendChild(chip("AUTO", workspace.warp === "AUTO" && pOk, () => handlers.setWarp("AUTO"), "AUTO warp"));
    row.appendChild(chip("OFF", workspace.warp === "OFF", () => handlers.setWarp("OFF"), "Warp off"));
    row.appendChild(chip("ADVANCED", workspace.warp === "ADVANCED", () => handlers.setWarp("ADVANCED"), "Advanced warp"));
    row.appendChild(chip("q " + workspace.q, false, () => handlers.nudgeQ(), "Toggle q"));
    row.appendChild(chip("n " + workspace.n, false, () => handlers.nudgeN(), "Cycle n"));
    row.appendChild(chip("MOVE Q", sel?.kind === "q", () => handlers.select({ kind: "q", id: "q", label: "Q content" }), "Move Q"));
  }
  el.appendChild(row);
  if (locks.childNodes.length) el.appendChild(locks);
}
