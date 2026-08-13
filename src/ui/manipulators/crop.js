export function applyCropPan(dispatch, pan, preview) {
  const payload = { pan: pan.slice() };
  if (preview) dispatch.preview("PAN_OUTER_FRAME", payload);
  else dispatch.commit("PAN_OUTER_FRAME", payload, "Pan crop");
}
