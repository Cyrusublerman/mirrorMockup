export function emptyEffective() {
  return {
    skeleton: { bones: {}, fk: {} },
    phone: { world: null, corners_world: [], mesh: null },
    camera: { world: null, basis: null, fx: 0, fy: 0, cx: 0, cy: 0 },
    apparatus: { frame: null, d_M: 0, pan_uv: [0, 0] },
    mirror: { centre: null, basis: null, width_m: 0, height_m: 0, mesh: null },
    virtual_camera: null,
    visibility: { masks: {}, reports: [] },
    composition_metrics: {},
    carrier_p: { quad: null, valid: false, reasons: [], homography: null },
    content_q: { mapping: null },
    recursion: { certificate: null, available: false, I: null },
    view: { camera: null, segment: "DOLLY", tau: 0, tau_M: 1, tau_P: 2 },
    constraints: [],
    sensitivity: [],
    residuals: {},
    feasible: null,
    aperture_band: null,
    occlusion_intent: null,
  };
}

export function constraintResult({
  state,
  constraint_id,
  requested,
  effective,
  residual = 0,
  residual_unit = "m",
  tolerance = 0,
  margin = 0,
  reason = "",
  active_constraints = [],
  moved_variables = [],
  sensitivity_summary = [],
}) {
  return {
    state,
    constraint_id,
    requested,
    effective,
    residual,
    residual_unit,
    tolerance,
    margin,
    reason,
    active_constraints,
    moved_variables,
    sensitivity_summary,
  };
}
