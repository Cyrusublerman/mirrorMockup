export function cropWindow(cropRequest) {
  const pan = cropRequest?.pan || [0, 0];
  const scale = cropRequest?.scale ?? 1;
  const w = scale;
  const h = scale;
  return {
    ox: 0.5 + pan[0] - w / 2,
    oy: 0.5 + pan[1] - h / 2,
    w,
    h,
    pan: pan.slice(),
    scale: w,
  };
}

export function captureToFinal(p, cropRequest) {
  if (!p) return null;
  const { ox, oy, w, h } = cropWindow(cropRequest);
  return [(p[0] - ox) / w, (p[1] - oy) / h];
}

export function finalToCapture(p, cropRequest) {
  if (!p) return null;
  const { ox, oy, w, h } = cropWindow(cropRequest);
  return [p[0] * w + ox, p[1] * h + oy];
}

export function panToPlace(capturePoint, finalPoint, scale = 1) {
  return [
    capturePoint[0] - 0.5 + scale / 2 - finalPoint[0] * scale,
    capturePoint[1] - 0.5 + scale / 2 - finalPoint[1] * scale,
  ];
}

export function mapQuad(quad, cropRequest) {
  if (!quad) return null;
  return quad.map((c) => (c ? captureToFinal(c, cropRequest) : null));
}
