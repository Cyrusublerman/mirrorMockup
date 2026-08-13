export function applyMirrorDistance(dispatch, d_M, preview) {
  const payload = { d_M };
  if (preview) dispatch.preview("SET_MIRROR_DISTANCE", payload);
  else dispatch.commit("SET_MIRROR_DISTANCE", payload, "Set d_M");
}

export function applyMirrorWindow(dispatch, uv, preview) {
  const payload = { uv: uv.slice() };
  if (preview) dispatch.preview("PAN_MIRROR_WINDOW", payload);
  else dispatch.commit("PAN_MIRROR_WINDOW", payload, "Pan mirror window");
}

export function applyAperture(dispatch, width_m, height_m, preview) {
  const payload = { width_m, height_m };
  if (preview) dispatch.preview("SET_MIRROR_APERTURE", payload);
  else dispatch.commit("SET_MIRROR_APERTURE", payload, "Set aperture");
}
