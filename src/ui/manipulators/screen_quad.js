export function hitScreenCorner(quad, uv, radius = 0.06) {
  if (!quad) return -1;
  let best = -1;
  let bestD = radius;
  for (let i = 0; i < 4; i++) {
    const p = quad[i];
    if (!p) continue;
    const d = Math.hypot(p[0] - uv[0], p[1] - uv[1]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function applyScreenCorner(dispatch, transform, preview) {
  const payload = {
    translation: transform.translation.slice(),
    yaw: transform.yaw,
    pitch: transform.pitch,
    roll: transform.roll,
  };
  if (preview) dispatch.preview("ROTATE_PHONE", payload);
  else dispatch.commit("ROTATE_PHONE", payload, "Drag screen corner");
}
