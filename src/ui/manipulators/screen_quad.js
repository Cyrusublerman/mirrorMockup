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

export function applyScreenCorner(dispatch, translation, preview) {
  const payload = { translation: translation.slice() };
  if (preview) dispatch.preview("MOVE_PHONE", payload);
  else dispatch.commit("MOVE_PHONE", payload, "Drag screen corner");
}
