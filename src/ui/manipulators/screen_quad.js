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

export function inverseCorner(translation, basis, duv, depth = 0.4) {
  const r = basis?.right || [1, 0, 0];
  const u = basis?.up || [0, 0, 1];
  return [
    translation[0] + r[0] * duv[0] * depth + u[0] * (-duv[1]) * depth,
    translation[1] + r[1] * duv[0] * depth + u[1] * (-duv[1]) * depth,
    translation[2] + r[2] * duv[0] * depth + u[2] * (-duv[1]) * depth,
  ];
}

export function applyScreenCorner(dispatch, translation, preview) {
  const payload = { translation: translation.slice() };
  if (preview) dispatch.preview("MOVE_PHONE", payload);
  else dispatch.commit("MOVE_PHONE", payload, "Drag screen corner");
}
