export const SOLVE_MODE = {
  POSE_FIRST: "POSE_FIRST",
  PHONE_FIRST: "PHONE_FIRST",
  MIRROR_RATIO_FIRST: "MIRROR_RATIO_FIRST",
  COMPOSITION_FIT: "COMPOSITION_FIT",
  P0_RECONSTRUCT: "P0_RECONSTRUCT",
  MANUAL: "MANUAL",
};

export function applySolveMode(requested, mode) {
  const next = structuredClone(requested);
  next.composition.solve_mode = mode;
  if (mode === "POSE_FIRST") {
    next.composition.active_preserve_set = ["apparatus_rotation", "fov", "support"];
    next.composition.solve_freedoms = ["pose"];
  } else if (mode === "PHONE_FIRST") {
    next.composition.solve_freedoms = ["pose", "mirror_distance"];
  } else if (mode === "MIRROR_RATIO_FIRST") {
    next.apparatus.mirror_distance_auto_solve = true;
  } else if (mode === "COMPOSITION_FIT") {
    next.composition.solve_freedoms = ["mirror_distance", "mirror_pan"];
    next.composition.active_preserve_set = ["apparatus_rotation", "support"];
  } else if (mode === "P0_RECONSTRUCT") {
    next.composition.solve_freedoms = ["pose", "mirror_distance", "phone"];
  }
  return next;
}

export function nudgeToPhoneTarget(req, residuals) {
  const phone = residuals?.phone;
  if (!phone?.effective || !phone.requested) return req;
  const freedoms = req.composition.solve_freedoms || [];
  if (!freedoms.includes("mirror_pan") && req.composition.solve_mode !== "COMPOSITION_FIT") return req;
  const dx = phone.requested[0] - phone.effective[0];
  const dy = phone.requested[1] - phone.effective[1];
  const pan = req.apparatus.mirror_pan_uv_request_m;
  const gain = 0.45;
  req.apparatus.mirror_pan_uv_request_m = [pan[0] + dx * gain, pan[1] - dy * gain];
  return req;
}
