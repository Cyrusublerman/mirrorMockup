import { TransactionCard } from "./transaction_card.js";

const transactionCard = new TransactionCard();

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
  const phase = workspace.phase;

  if (phase === "DECLARE") {
    for (const id of ["GESTURE", "VOLUME", "CONTOUR"]) row.appendChild(chip(id, workspace.body_mode === id, () => handlers.setBodyMode(id), id + " representation"));
    row.appendChild(chip("PHONE DRIVES", workspace.drive_mode === "PHONE_DRIVES_HAND", () => handlers.setDrive("PHONE_DRIVES_HAND"), "Phone drives hand"));
    row.appendChild(chip("HAND DRIVES", workspace.drive_mode === "HAND_DRIVES_PHONE", () => handlers.setDrive("HAND_DRIVES_PHONE"), "Hand drives phone"));
    row.appendChild(chip("LOCK GRIP", workspace.drive_mode === "LOCK_GRIP", () => handlers.setDrive("LOCK_GRIP"), "Lock grip"));
    row.appendChild(chip("RIGHT ARM · 7", sel?.kind === "arm7", () => handlers.select({ kind: "arm7", id: "right_arm", label: "Right arm · 7 DOF" }), "Right arm numeric control"));
    row.appendChild(chip("TORSO · 3 BOXES", sel?.kind === "torso", () => handlers.select({ kind: "torso", id: "torso", label: "Torso · three boxes" }), "Torso numeric control"));
    row.appendChild(chip("OPACITY", false, () => handlers.cycleOpacity(), "Reference opacity"));

    const declarations = document.createElement("div");
    declarations.className = "mp-row mp-declarations";
    const topo = proj.requested?.camera?.topology_request;
    declarations.append(
      chip("FRONT CAMERA SELFIE", topo === "FRONT_CAMERA_SELFIE" && proj.requested?.camera?.topology_epistemic === "DECLARED", () => handlers.setTopology("FRONT_CAMERA_SELFIE"), "Declare front-camera selfie topology"),
      chip("CAMERA BETWEEN", topo === "CAMERA_BETWEEN" && proj.requested?.camera?.topology_epistemic === "DECLARED", () => handlers.setTopology("CAMERA_BETWEEN"), "Declare camera-between topology"),
    );
    const policy = proj.requested?.composition?.phone_scale_policy || "UNRESOLVED";
    declarations.append(
      chip("f UNRESOLVED", policy === "UNRESOLVED", () => handlers.setPhoneScalePolicy("UNRESOLVED"), "Phone scale unresolved"),
      chip("f SOLVED", policy === "SOLVED", () => handlers.setPhoneScalePolicy("SOLVED"), "Phone scale solved"),
      chip("f INDEPENDENT", policy === "INDEPENDENT", () => handlers.setPhoneScalePolicy("INDEPENDENT"), "Phone scale independent"),
    );
    const conv = proj.requested?.reference?.p0_occupancy_convention;
    declarations.append(
      chip("P0 SILHOUETTE", conv === "SILHOUETTE", () => handlers.setP0Convention("SILHOUETTE"), "Declare P0 occupancy silhouette"),
      chip("P0 BBOX", conv === "BBOX", () => handlers.setP0Convention("BBOX"), "Declare P0 occupancy bbox"),
    );
    const rr = proj.requested?.reference?.head_silhouette_radius_m;
    declarations.append(
      chip("HEAD r 0.115", Math.abs((rr || 0) - 0.115) < 1e-9, () => handlers.setHeadRadius(0.115), "Declare hair-included head radius"),
      chip("HEAD r 0.105", Math.abs((rr || 0) - 0.105) < 1e-9, () => handlers.setHeadRadius(0.105), "Declare hair-excluded head radius"),
    );
    el.appendChild(row);
    el.appendChild(declarations);
  } else if (phase === "SOLVE") {
    row.appendChild(chip("d_M", sel?.id === "d_M", () => handlers.select({ kind: "mirror", id: "d_M", label: "Mirror distance" }), "Mirror distance"));
    row.appendChild(chip("WINDOW", sel?.id === "window", () => handlers.select({ kind: "mirror", id: "window", label: "Mirror window pan" }), "Pan mirror window"));
    row.appendChild(chip("APPARATUS", sel?.id === "apparatus", () => handlers.select({ kind: "apparatus", id: "apparatus", label: "Apparatus pan" }), "Pan apparatus"));
    row.appendChild(chip("CROP", sel?.kind === "crop", () => handlers.select({ kind: "crop", id: "crop", label: "Crop pan" }), "Pan crop"));
    row.appendChild(chip("REFLECTED", sel?.id === "reflected", () => handlers.select({ kind: "reflected", id: "reflected", label: "Pan reflected content" }), "Pan reflected content"));
    row.appendChild(chip("OPACITY", false, () => handlers.cycleOpacity(), "Reference opacity"));
    el.appendChild(row);

    const locks = document.createElement("div");
    locks.className = "mp-row";
    const lockIds = [["PHONE_AREA", "PHONE AREA"], ["REFLECTED_BODY_SCALE", "REFLECTED BODY SCALE"], ["MIRROR_OCCUPANCY", "MIRROR OCCUPANCY"], ["SUPPORT", "SUPPORT"], ["GRIP", "GRIP"], ["P_VALID", "P VALID"]];
    const onLocks = proj.requested?.composition?.locks || {};
    for (const [id, label] of lockIds) locks.appendChild(chip(label, !!onLocks[id], () => handlers.toggleLock(id), label));
    el.appendChild(locks);
  } else {
    row.appendChild(chip("STAGING PRESCRIPTION", workspace.output_mode === "STAGING", () => handlers.setOutput?.("STAGING"), "Staging prescription output"));
    row.appendChild(chip("MEASURE PHONE WIDTH", false, () => handlers.select({ kind: "phone_width", id: "phone_width", label: "Measured phone width" }), "Measure phone width"));
    el.appendChild(row);
  }

  if (workspace.output_mode === "RECURSION") {
    const rec = document.createElement("div");
    rec.className = "mp-row";
    const pOk = !!proj.portal?.valid;
    rec.append(
      chip("AUTO", workspace.warp === "AUTO" && pOk, () => handlers.setWarp("AUTO"), "AUTO warp"),
      chip("OFF", workspace.warp === "OFF", () => handlers.setWarp("OFF"), "Warp off"),
      chip("ADVANCED", workspace.warp === "ADVANCED", () => handlers.setWarp("ADVANCED"), "Advanced warp"),
      chip("q " + workspace.q, false, () => handlers.nudgeQ(), "Toggle q"),
      chip("n " + workspace.n, false, () => handlers.nudgeN(), "Cycle n"),
      chip("MOVE Q", sel?.kind === "q", () => handlers.select({ kind: "q", id: "q", label: "Q content" }), "Move Q"),
    );
    el.appendChild(rec);
  }

  const txn = document.createElement("div");
  transactionCard.mount(txn, proj);
  el.appendChild(txn);
}
