export function drawRecursionPortal(ctx, w, h, proj) {
  const quad = proj.portal?.P?.quad;
  if (!quad) return;
  ctx.save();
  ctx.strokeStyle = "#D82D84";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(quad[0][0] * w, quad[0][1] * h);
  for (let i = 1; i < 4; i++) ctx.lineTo(quad[i][0] * w, quad[i][1] * h);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
