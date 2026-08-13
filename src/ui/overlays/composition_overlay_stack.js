import { drawRequestedEffective } from "./requested_effective.js";
import { drawApparatus } from "./apparatus.js";
import { drawRecursionPortal } from "./recursion.js";

export const CATALOGUE = [
  "GRID", "BBOX", "CENTROID", "MEASURE", "PERSPECTIVE",
  "CORRESPONDENCE", "VISIBILITY", "APPARATUS", "RECURSION", "DISTORTION",
];

export function drawOverlays(ctx, w, h, workspace, proj) {
  const o = workspace.overlays;
  ctx.clearRect(0, 0, w, h);
  if (o.GRID) {
    ctx.save();
    ctx.strokeStyle = "rgba(24,24,24,0.18)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo((w * i) / 3, 0);
      ctx.lineTo((w * i) / 3, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (h * i) / 3);
      ctx.lineTo(w, (h * i) / 3);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (o.BBOX) {
    ctx.save();
    ctx.strokeStyle = "#395BD6";
    ctx.strokeRect(w * 0.22, h * 0.12, w * 0.56, h * 0.76);
    ctx.restore();
  }
  if (o.CENTROID) {
    ctx.save();
    ctx.fillStyle = "#D82D84";
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.42, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (o.MEASURE) {
    const stature = proj.requested?.body?.definition?.stature || 1.7;
    ctx.save();
    ctx.strokeStyle = "#395BD6";
    ctx.beginPath();
    ctx.moveTo(18, h * 0.2);
    ctx.lineTo(18, h * 0.8);
    ctx.stroke();
    ctx.fillStyle = "#395BD6";
    ctx.font = "11px system-ui,sans-serif";
    ctx.fillText(`${stature.toFixed(2)} m`, 24, h * 0.5);
    ctx.restore();
  }
  if (o.PERSPECTIVE) {
    ctx.save();
    ctx.strokeStyle = "rgba(57,91,214,0.45)";
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 0);
    ctx.lineTo(w * 0.2, h);
    ctx.moveTo(w * 0.5, 0);
    ctx.lineTo(w * 0.8, h);
    ctx.stroke();
    ctx.restore();
  }
  if (o.APPARATUS) drawApparatus(ctx, w, h, proj);
  if (o.RECURSION) drawRecursionPortal(ctx, w, h, proj);
  if (o.VISIBILITY && proj.occlusion) {
    ctx.save();
    ctx.fillStyle = "rgba(24,24,24,0.55)";
    ctx.font = "11px system-ui,sans-serif";
    ctx.fillText(
      `hand ${Number(proj.occlusion.hand_visibility || 0).toFixed(2)}  face ${Number(proj.occlusion.face_visibility || 0).toFixed(2)}`,
      12,
      h - 12,
    );
    ctx.restore();
  }
  drawRequestedEffective(ctx, w, h, proj);
}
