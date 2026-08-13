export function applyEndpointIk(dispatch, end, world, preview) {
  const payload = { end, world: world.slice() };
  if (preview) dispatch.preview("MOVE_POSE_TARGET", payload);
  else dispatch.commit("MOVE_POSE_TARGET", payload, `Move ${end}`);
}
