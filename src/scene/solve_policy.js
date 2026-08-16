export const SOLVE_MODE = {
  POSE_FIRST: "POSE_FIRST",
  PHONE_FIRST: "PHONE_FIRST",
  MIRROR_RATIO_FIRST: "MIRROR_RATIO_FIRST",
  COMPOSITION_FIT: "COMPOSITION_FIT",
  P0_RECONSTRUCT: "P0_RECONSTRUCT",
  MANUAL: "MANUAL",
};

export const PRODUCTION_LOCKS = Object.freeze([
  "apparatus_rotation",
  "camera_rigid_to_phone",
  "link_lengths",
]);

export const MODE_TABLE = Object.freeze({
  POSE_FIRST: {
    driver: "pose",
    preserve: [...PRODUCTION_LOCKS, "fov", "R_P"],
    allowed_to_move: ["pose"],
  },
  PHONE_FIRST: {
    driver: "phone",
    preserve: [...PRODUCTION_LOCKS, "R_P"],
    allowed_to_move: ["phone", "pose", "mirror_distance"],
  },
  MIRROR_RATIO_FIRST: {
    driver: "R_P",
    preserve: [...PRODUCTION_LOCKS, "fov"],
    allowed_to_move: ["mirror_distance"],
  },
  COMPOSITION_FIT: {
    driver: "composition_targets",
    preserve: [...PRODUCTION_LOCKS, "support", "grip"],
    allowed_to_move: ["pose", "phone", "mirror_distance", "crop_pan"],
  },
  P0_RECONSTRUCT: {
    driver: "P0_fixture",
    preserve: [...PRODUCTION_LOCKS, "crop_aspect"],
    allowed_to_move: ["pose", "phone", "mirror_distance", "crop_pan"],
  },
  MANUAL: {
    driver: "gesture",
    preserve: [],
    allowed_to_move: ["x_decision"],
  },
});

export function modeMask(mode) {
  return MODE_TABLE[mode] || MODE_TABLE.MANUAL;
}

export function applySolveMode(requested, mode) {
  const next = structuredClone(requested);
  const row = modeMask(mode);
  next.composition.solve_mode = mode;
  next.composition.driver = row.driver;
  const preserve = row.preserve.slice();
  if (requested.phone?.authority === "LOCK_GRIP" && !preserve.includes("grip")) preserve.push("grip");
  if (requested.composition?.locks?.PHONE_AREA && !preserve.includes("R_P")) preserve.push("R_P");
  next.composition.active_preserve_set = preserve;
  next.composition.solve_freedoms = row.allowed_to_move.slice();
  if (mode === "MIRROR_RATIO_FIRST" || requested.composition?.locks?.PHONE_AREA) {
    next.apparatus.mirror_distance_auto_solve = true;
  }
  return next;
}

export function allows(req, name) {
  const f = req.composition?.solve_freedoms || [];
  if (f.includes("x_decision")) return true;
  return f.includes(name);
}

export const LOCK_CHIPS = Object.freeze([
  { id: "PHONE_AREA", relation: "R_P", target: "preserved_reflected_phone_ratio" },
  { id: "REFLECTED_BODY_SCALE", relation: "lambda_star", target: "same_anatomy_scale" },
  { id: "MIRROR_OCCUPANCY", relation: "mirror_occupancy", target: "T-MOCC" },
  { id: "SUPPORT", relation: "support", target: "support_request" },
  { id: "GRIP", relation: "grip", target: "grip_relation" },
  { id: "P_VALID", relation: "carrier_p", target: "carrier_p.valid" },
]);
