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
  } else if (mode === "P0_RECONSTRUCT") {
    next.composition.solve_freedoms = ["pose", "mirror_distance", "phone"];
  }
  return next;
}
