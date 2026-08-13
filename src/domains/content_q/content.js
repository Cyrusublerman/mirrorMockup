export const SIZE_BASES = ["Width%", "Height%", "Area%", "Contain", "Cover"];

export function evaluateQ(requested, carrierP) {
  const basis = requested.content_q.size_basis || requested.content_q.fill_mode || "Cover";
  return {
    fill_mode: requested.content_q.fill_mode,
    size_basis: basis,
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
  const fill = qState.size_basis || qState.fill_mode || "cover";
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  let scaleX = scale || 1;
  let scaleY = scale || 1;
  if (fill === "Width%" || fill === "width") scaleY = scaleX;
  if (fill === "Height%" || fill === "height") scaleX = scaleY;
  if (fill === "Area%") {
    const sA = Math.sqrt(Math.abs(scale) || 1);
    scaleX = sA;
    scaleY = sA;
  }
  const u = uv[0] - 0.5;
  const v = uv[1] - 0.5;
  let x = (c * u - s * v) / (scaleX || 1) + 0.5 - off[0];
  let y = (s * u + c * v) / (scaleY || 1) + 0.5 - off[1];
  x = (crop.x || 0) + x * (crop.w ?? 1);
  y = (crop.y || 0) + y * (crop.h ?? 1);
  if ((fill === "contain" || fill === "Contain") && (x < 0 || x > 1 || y < 0 || y > 1)) return [0.11, 0.12, 0.16];
  if (fill === "cover" || fill === "Cover") {
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
