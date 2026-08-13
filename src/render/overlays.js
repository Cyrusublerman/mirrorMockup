export function overlayList(requested) {
  return requested.workspace.overlays;
}

export function drawOverlays(ctx, requested, effective, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (requested.workspace.overlays.P && effective.carrier_p.quad) {
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 2;
    const q = effective.carrier_p.quad;
    ctx.beginPath();
    ctx.moveTo(q[0][0] * w, q[0][1] * h);
    for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0] * w, q[i][1] * h);
    ctx.closePath();
    ctx.stroke();
  }
  if (requested.workspace.overlays.REFERENCE && requested.reference.landmarks?.features) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    for (const [id, f] of Object.entries(requested.reference.landmarks.features)) {
      if (!f.centroid) continue;
      const x = f.centroid[0] * w;
      const y = f.centroid[1] * h;
      ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.font = "10px sans-serif";
      ctx.fillText(id, x + 5, y);
    }
  }
}
