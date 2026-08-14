export function drawRequestedEffective(ctx, w, h, proj) {
  const ends = proj.requested?.body?.pose_targets?.endpoint_targets || {};
  const fk = proj.pose?.fk || {};
  const want = ends.wrist_R;
  const got = fk.wrist_R;
  const lim = (proj.pose?.constraints || []).find((c) => c.id === "arm_R_reach");
  ctx.save();
  ctx.font = "11px system-ui,sans-serif";
  if (want && got) {
    const dist = Math.hypot(want[0] - got[0], want[1] - got[1], want[2] - got[2]);
    if (dist > 0.03) {
      ctx.fillStyle = "#1A1A1A";
      ctx.fillText("requested ghost", 12, 18);
      ctx.fillStyle = "#395BD6";
      ctx.fillText("effective endpoint", 12, 32);
      ctx.fillStyle = "#181818";
      ctx.fillText(`residual ${dist.toFixed(3)} m  ${lim?.state || ""}`, 12, 46);
    }
  }
  ctx.restore();
}
