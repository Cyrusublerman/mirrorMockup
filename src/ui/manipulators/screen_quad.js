export function applyScreenCorner(dispatch, translation, preview) {
  const payload = { translation: translation.slice() };
  if (preview) dispatch.preview("MOVE_PHONE", payload);
  else dispatch.commit("MOVE_PHONE", payload, "Drag screen corner");
}
