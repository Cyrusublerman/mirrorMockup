export function applySemanticJoint(dispatch, joint, euler, axis, delta, preview) {
  const next = { ...euler };
  const key = axis === "BEND" ? "bend" : axis === "TILT" ? "tilt" : "twist";
  next[key] = (next[key] || 0) + delta;
  const payload = { joint, bend: next.bend || 0, tilt: next.tilt || 0, twist: next.twist || 0 };
  if (preview) dispatch.preview("SET_ANATOMICAL_DOF", payload);
  else dispatch.commit("SET_ANATOMICAL_DOF", payload, `Rotate ${joint}`);
  return next;
}
