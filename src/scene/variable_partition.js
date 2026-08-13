export function partitionX(requested) {
  const mode = requested.composition?.solve_mode;
  const freedoms = requested.composition?.solve_freedoms || [];
  const preserve = requested.composition?.active_preserve_set || [];
  const x_decision = [];
  const x_dependent = [
    "camera_world",
    "P",
    "R_P",
    "d_M_derived",
    "p_u_derived",
    "p_v_derived",
    "visibility",
    "recursion_certificate",
  ];
  const x_locked = ["cx", "cy", "mirror_orientation"];
  if (preserve.includes("apparatus_rotation")) x_locked.push("mirror_yaw", "mirror_pitch", "mirror_roll");
  if (preserve.includes("camera_rigid_to_phone")) x_locked.push("camera_local_rotation");
  if (preserve.includes("link_lengths")) x_locked.push("bone_lengths");
  if (preserve.includes("grip") || requested.phone?.authority === "LOCK_GRIP") x_locked.push("grip_relation");
  if (preserve.includes("fov")) x_locked.push("hfov");
  if (preserve.includes("crop_aspect")) x_locked.push("crop_aspect");
  if (freedoms.includes("pose") || freedoms.includes("x_decision")) x_decision.push("pose");
  if (freedoms.includes("phone") || freedoms.includes("x_decision")) x_decision.push("phone");
  if (freedoms.includes("mirror_distance") || freedoms.includes("x_decision")) x_decision.push("mirror_distance");
  if (freedoms.includes("crop_pan") || freedoms.includes("x_decision")) x_decision.push("crop_pan");
  if (mode === "MANUAL") {
    const last = requested.workspace?.last_edit?.driver;
    if (last && !x_decision.includes(last)) x_decision.push(last);
  }
  return { x_decision, x_dependent, x_locked };
}
