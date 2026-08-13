export function applyQOffset(dispatch, offset, preview) {
  const payload = { offset: offset.slice() };
  if (preview) dispatch.preview("SET_CONTENT_Q", payload);
  else dispatch.commit("SET_CONTENT_Q", payload, "Move Q");
}
