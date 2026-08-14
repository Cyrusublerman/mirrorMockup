import { IK_JOINTS } from "../../render/bone_index.js";

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

export class ContextualDock {
  mount(el, workspace, proj, handlers) {
    el.replaceChildren();
    const title = document.createElement("div");
    title.className = "mp-sel";
    const sel = workspace.selected;
    title.textContent = sel ? sel.label : "Tap the figure, phone or mirror";
    el.appendChild(title);
    const row = document.createElement("div");
    row.className = "mp-row";
    const kind = this.kindOf(sel);
    if (kind === "HEAD") {
      for (const a of ["BEND", "TILT", "ROTATE"]) {
        row.appendChild(chip(a, workspace.axis === a, () => handlers.setAxis(a), a));
      }
    } else if (kind === "WRIST") {
      row.appendChild(chip("PHONE DRIVES", workspace.drive_mode === "PHONE_DRIVES_HAND", () => handlers.setDrive("PHONE_DRIVES_HAND"), "Phone drives hand"));
      row.appendChild(chip("HAND DRIVES", workspace.drive_mode === "HAND_DRIVES_PHONE", () => handlers.setDrive("HAND_DRIVES_PHONE"), "Hand drives phone"));
      row.appendChild(chip("LOCK GRIP", workspace.drive_mode === "LOCK_GRIP", () => handlers.setDrive("LOCK_GRIP"), "Lock grip"));
    } else if (kind === "PHONE") {
      row.appendChild(chip("PHONE DRIVES", workspace.drive_mode === "PHONE_DRIVES_HAND", () => handlers.setDrive("PHONE_DRIVES_HAND"), "Phone drives hand"));
      row.appendChild(chip("MOVE", true, () => {}, "Phone is rigid"));
    } else if (kind === "MIRROR") {
      row.appendChild(chip("d_M", sel?.id === "d_M", () => handlers.select({ kind: "mirror", id: "d_M", label: "Mirror distance" }), "Mirror distance"));
      row.appendChild(chip("WINDOW", sel?.id === "window", () => handlers.select({ kind: "mirror", id: "window", label: "Mirror window pan" }), "Pan mirror window"));
    } else if (kind === "CAMERA") {
      row.appendChild(chip("CROP", sel?.kind === "crop", () => handlers.select({ kind: "crop", id: "crop", label: "Crop pan" }), "Pan crop"));
      row.appendChild(chip("HFOV", false, () => handlers.openPrecision?.(), "Field of view"));
      row.appendChild(chip("FINAL CROP", workspace.crop_mode !== "FULL_SENSOR", () => handlers.setCropMode?.("FINAL_CROP"), "Final crop"));
      row.appendChild(chip("FULL SENSOR", workspace.crop_mode === "FULL_SENSOR", () => handlers.setCropMode?.("FULL_SENSOR"), "Full sensor"));
    } else if (workspace.room === "POSE") {
      row.appendChild(chip("RIGGED", workspace.body_mode === "RIGGED", () => handlers.setBodyMode("RIGGED"), "Rigged"));
      row.appendChild(chip("STICK", workspace.body_mode === "STICK", () => handlers.setBodyMode("STICK"), "Stick"));
      row.appendChild(chip("SIMPLE", workspace.body_mode === "SIMPLE", () => handlers.setBodyMode("SIMPLE"), "Simple"));
      for (const id of ["A", "B", "C"]) {
        row.appendChild(chip("POSE " + id, false, () => handlers.loadSnapshot?.(id), "Load pose snapshot " + id));
      }
    } else if (workspace.room === "SCENE") {
      row.appendChild(chip("APPARATUS", sel?.id === "apparatus", () => handlers.select({ kind: "apparatus", id: "apparatus", label: "Apparatus pan" }), "Pan apparatus"));
    } else if (workspace.room === "RECURSION") {
      const pOk = !!proj.portal?.valid;
      row.appendChild(chip("AUTO", workspace.warp === "AUTO" && pOk, () => handlers.setWarp("AUTO"), "AUTO warp"));
      row.appendChild(chip("OFF", workspace.warp === "OFF", () => handlers.setWarp("OFF"), "Warp off"));
    }
    if (sel?.kind === "joint" && !IK_JOINTS.includes(sel.id) && kind !== "HEAD") {
      for (const a of ["BEND", "TILT", "ROTATE"]) {
        row.appendChild(chip(a, workspace.axis === a, () => handlers.setAxis(a), a));
      }
    }
    el.appendChild(row);
  }

  kindOf(sel) {
    if (!sel) return null;
    if (sel.kind === "joint" && sel.id === "head") return "HEAD";
    if (sel.kind === "joint" && IK_JOINTS.includes(sel.id)) return "WRIST";
    if (sel.kind === "phone") return "PHONE";
    if (sel.kind === "mirror") return "MIRROR";
    if (sel.kind === "crop" || sel.kind === "camera") return "CAMERA";
    return null;
  }
}
