export function drawRequestedEffective(ctx, w, h, proj) {
  const ends = proj.requested?.body?.pose_targets?.endpoint_targets || {};
  const fk = proj.pose?.fk || {};
  const want = ends.wrist_R;
  const got = fk.wrist_R;
  if (!want || !got) return;
  const dx = want[0] - got[0], dy = want[1] - got[1], dz = want[2] - got[2];
  if (Math.hypot(dx, dy, dz) <= 0.03) return;
  ctx.save();
  ctx.fillStyle = "#D82D84";
  ctx.font = "11px system-ui,sans-serif";
  ctx.fillText("requested  ≠  effective", 12, 18);
  ctx.restore();
}
