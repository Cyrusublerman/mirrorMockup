export function namedConstraint(c) {
  return {
    state: c.state,
    constraint_id: c.constraint_id,
    requested: c.requested,
    effective: c.effective,
    residual: c.residual,
    residual_unit: c.residual_unit || "m",
    tolerance: c.tolerance || 0,
    margin: c.margin || 0,
    reason: c.reason || "",
    driver: c.driver || null,
    preserve: c.preserve || [],
    allowed_to_move: c.allowed_to_move || [],
  };
}
