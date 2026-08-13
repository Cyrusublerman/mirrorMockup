export function overlayList(requested) {
  return requested.workspace.overlays;
}

function toCanvas(p, w, h) {
  return [p[0] * w, p[1] * h];
}

function strokeQuad(ctx, q, w, h, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const p0 = toCanvas(q[0], w, h);
  ctx.moveTo(p0[0], p0[1]);
  for (let i = 1; i < 4; i++) {
    const p = toCanvas(q[i], w, h);
    ctx.lineTo(p[0], p[1]);
  }
  ctx.closePath();
  ctx.stroke();
}

export function drawOverlays(ctx, requested, effective, w, h) {
  ctx.clearRect(0, 0, w, h);
  const vis = requested.workspace.overlays || {};
  const q = effective.carrier_p?.quad;
  if (vis.P && q) strokeQuad(ctx, q, w, h, "#c9a227");
  if (vis.PHONE && q) strokeQuad(ctx, q, w, h, "#00c2d1");
  if (vis.REFERENCE && requested.reference.landmarks?.features) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    for (const [id, f] of Object.entries(requested.reference.landmarks.features)) {
      if (!f.centroid) continue;
      const [x, y] = toCanvas(f.centroid, w, h);
      ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.font = "10px sans-serif";
      ctx.fillText(id, x + 5, y);
    }
  }
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  let ty = 14;
  if (effective.view?.segment) {
    ctx.fillText(effective.view.segment, 8, ty);
    ty += 14;
  }
  const cert = effective.recursion?.certificate;
  if (cert) {
    const arg = (cert.gamma_arg * 180) / Math.PI;
    ctx.fillText(`γ |${Number(cert.gamma_abs).toFixed(3)}| ${arg.toFixed(1)}°`, 8, ty);
    ty += 14;
  }
  const residuals = effective.residuals || {};
  const nums = Object.values(residuals)
    .map((r) => r?.residual)
    .filter((x) => x != null && Number.isFinite(x));
  if (nums.length) {
    ctx.fillText(`max residual ${Math.max(...nums).toFixed(4)}`, 8, ty);
  }
}
