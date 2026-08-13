export function drawApparatus(ctx, w, h, proj) {
  if (!proj.compensation) return;
  const c = proj.compensation;
  ctx.save();
  ctx.fillStyle = "#A66800";
  ctx.font = "11px system-ui,sans-serif";
  ctx.fillText(`autosolve d_M ${Number(c.from).toFixed(3)} → ${Number(c.to).toFixed(3)}  (${c.reason})`, 12, 34);
  ctx.restore();
}
