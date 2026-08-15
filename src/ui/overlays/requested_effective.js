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
  const epi = proj.epistemic || {};
  const hollow = ["HYPOTHESIS", "PROVISIONAL", "UNMEASURED", "UNRESOLVED", "ASSUMED"].includes(String(epi.camera || "").toUpperCase());
  ctx.fillStyle = hollow ? "#A66800" : "#2E7D4A";
  ctx.fillText(hollow ? "hollow distances" : "solid distances", 12, h - 14);
  if (proj.feasible && workspaceStage(proj)) {
    ctx.fillStyle = "#181818";
    ctx.fillText(`stand ${Number(proj.feasible.m || 0).toFixed(2)} m   offset ${Number(proj.feasible.e || 0).toFixed(2)} m`, 12, h - 28);
  }
  ctx.restore();
}

function workspaceStage(proj) {
  const mode = proj.requested?.workspace?.mode;
  return mode === "STAGE" || mode === "SOLVE";
}
