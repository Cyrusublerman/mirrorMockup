export function overlayList(requested) {
  return activeOverlays(requested);
}

export function activeOverlays(requested) {
  const mode = requested.workspace.mode;
  const sel = requested.workspace.selection;
  const stored = requested.workspace.overlays || {};
  if (mode === "INSPECT") {
    return {
      ...stored,
      REQUESTED_EFFECTIVE: true,
      SENSITIVITY: true,
      CORRESPONDENCE: true,
    };
  }
  return {
    REFERENCE: mode === "COMPOSITION" || sel === "reference",
    GRID: false,
    LANDMARKS: mode === "COMPOSITION",
    BBOX: mode === "COMPOSITION",
    SKELETON: mode === "POSE" || sel === "body",
    REACH: mode === "POSE" || sel === "body",
    SUPPORT: mode === "POSE" || sel === "body",
    PHONE: mode === "SCENE" || sel === "phone",
    CAMERA: mode === "SCENE" || sel === "phone",
    APPARATUS: mode === "SCENE",
    MIRROR: mode === "SCENE" || sel === "mirror",
    MIRROR_HITS: sel === "mirror",
    VISIBILITY: sel === "mirror",
    P: mode === "RECURSION" || sel === "phone" || sel === "p",
    Q: mode === "RECURSION",
    RECURSION: mode === "RECURSION",
  };
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
  const vis = activeOverlays(requested);
  const q = effective.carrier_p?.quad;
  if (vis.P && q) strokeQuad(ctx, q, w, h, "#c9a227");
  if (vis.PHONE && q) strokeQuad(ctx, q, w, h, "#00c2d1");
  if ((vis.REFERENCE || vis.LANDMARKS) && requested.reference.landmarks?.features) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    for (const [id, f] of Object.entries(requested.reference.landmarks.features)) {
      if (!f.bbox_centre && !f.centroid) continue;
      const [x, y] = toCanvas(f.bbox_centre || f.centroid, w, h);
      ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.font = "10px sans-serif";
      ctx.fillText(id, x + 5, y);
    }
  }
  if (vis.SKELETON && effective.visibility?.reports) {
    ctx.fillStyle = "rgba(40,40,120,0.7)";
    for (const r of Object.values(effective.visibility.reports)) {
      const p = r.reflected?.projection?.image_norm;
      if (!p) continue;
      const [x, y] = toCanvas(p, w, h);
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
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
  if (vis.REQUESTED_EFFECTIVE && effective.compensation) {
    const c = effective.compensation;
    ctx.fillText(`compensate ${c.variable} ${Number(c.from).toFixed(3)}→${Number(c.to).toFixed(3)}`, 8, ty);
    ty += 14;
  }
  const last = effective.last_edit;
  if (last) {
    ctx.fillText(`driver ${last.driver} · move ${last.allowed_to_move.join(",")}`, 8, ty);
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
