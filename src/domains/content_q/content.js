export function evaluateQ(requested, carrierP) {
  return {
    fill_mode: requested.content_q.fill_mode,
    scale: requested.content_q.scale,
    offset: requested.content_q.offset.slice(),
    rotation: requested.content_q.rotation,
    crop: { ...requested.content_q.crop },
    carrier_unchanged: true,
    mapping: carrierP?.homography || null,
  };
}

export function sampleQ(uv, qState = {}) {
  const scale = qState.scale ?? 1;
  const off = qState.offset || [0, 0];
  const rot = qState.rotation || 0;
  const crop = qState.crop || { x: 0, y: 0, w: 1, h: 1 };
  const fill = qState.fill_mode || "cover";
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const u = uv[0] - 0.5;
  const v = uv[1] - 0.5;
  let x = (c * u - s * v) / (scale || 1) + 0.5 - off[0];
  let y = (s * u + c * v) / (scale || 1) + 0.5 - off[1];
  x = (crop.x || 0) + x * (crop.w ?? 1);
  y = (crop.y || 0) + y * (crop.h ?? 1);
  if (fill === "contain" && (x < 0 || x > 1 || y < 0 || y > 1)) return [0.11, 0.12, 0.16];
  if (fill === "cover") {
    const ax = Math.abs(crop.w ?? 1);
    const ay = Math.abs(crop.h ?? 1);
    if (ax > 1e-12 && ay > 1e-12 && Math.abs(ax - ay) > 1e-12) {
      if (ax > ay) x = 0.5 + (x - 0.5) * (ay / ax);
      else y = 0.5 + (y - 0.5) * (ax / ay);
    }
  }
  x = ((x % 1) + 1) % 1;
  y = ((y % 1) + 1) % 1;
  const t = 2 * Math.PI;
  return [
    0.5 + 0.49 * Math.sin(t * x) * Math.cos(t * y),
    0.5 + 0.49 * Math.sin(t * 2 * x + t * y),
    0.5 + 0.49 * Math.cos(t * x - t * 2 * y),
  ];
}
