import { drawRequestedEffective } from "./requested_effective.js";
import { drawApparatus } from "./apparatus.js";
import { drawRecursionPortal } from "./recursion.js";

export const CATALOGUE = [
  "GRID", "BBOX", "CENTROID", "MEASURE", "PERSPECTIVE",
  "CORRESPONDENCE", "VISIBILITY", "APPARATUS", "RECURSION", "DISTORTION",
];

function px(p, w, h) {
  return [p[0] * w, p[1] * h];
}

export function drawOverlays(ctx, w, h, workspace, proj) {
  const o = workspace.overlays;
  const targets = proj.targets || [];
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
    for (const t of targets) {
      const b = t.bbox;
      if (!b?.tl || !b?.br) continue;
      const [x0, y0] = px(b.tl, w, h);
      const [x1, y1] = px(b.br, w, h);
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }
    ctx.restore();
  }
  if (o.CENTROID) {
    ctx.save();
    for (const t of targets) {
      if (t.requested) {
        ctx.fillStyle = "#D82D84";
        const [x, y] = px(t.requested, w, h);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (t.effective) {
        ctx.fillStyle = "#395BD6";
        const [x, y] = px(t.effective, w, h);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  if (o.CORRESPONDENCE) {
    ctx.save();
    ctx.strokeStyle = "#D82D84";
    for (const t of targets) {
      if (!t.requested || !t.effective) continue;
      const a = px(t.requested, w, h);
      const b = px(t.effective, w, h);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (o.MEASURE) {
    const stature = proj.requested?.body?.definition?.stature || 1.7;
    const dM = proj.effective?.apparatus?.d_M;
    ctx.save();
    ctx.strokeStyle = "#395BD6";
    ctx.beginPath();
    ctx.moveTo(18, h * 0.2);
    ctx.lineTo(18, h * 0.8);
    ctx.stroke();
    ctx.fillStyle = "#395BD6";
    ctx.font = "11px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(`stature ${stature.toFixed(2)} m`, 24, h * 0.48);
    if (Number.isFinite(dM)) ctx.fillText(`d_M ${dM.toFixed(3)} m`, 24, h * 0.52);
    ctx.restore();
  }
  if (o.PERSPECTIVE) {
    ctx.save();
    ctx.strokeStyle = "rgba(57,91,214,0.45)";
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.08);
    ctx.lineTo(w * 0.12, h);
    ctx.moveTo(w * 0.5, h * 0.08);
    ctx.lineTo(w * 0.88, h);
    ctx.stroke();
    ctx.restore();
  }
  if (o.APPARATUS) drawApparatus(ctx, w, h, proj);
  if (o.RECURSION) drawRecursionPortal(ctx, w, h, proj);
  if (o.VISIBILITY && proj.occlusion) {
    ctx.save();
    ctx.fillStyle = "rgba(24,24,24,0.55)";
    ctx.font = "11px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(
      `hand vis ${Number(proj.occlusion.hand_visibility || 0).toFixed(2)}  face vis ${Number(proj.occlusion.face_visibility || 0).toFixed(2)}`,
      12,
      h - 12,
    );
    ctx.restore();
  }
  if (o.DISTORTION && proj.rec) {
    ctx.save();
    ctx.fillStyle = "#A66800";
    ctx.font = "11px ui-sans-serif,system-ui,sans-serif";
    const fold = proj.rec.no_fold === false ? "FOLD" : "no-fold";
    const det = Number.isFinite(proj.rec.detJ) ? proj.rec.detJ.toFixed(4) : "—";
    ctx.fillText(`distortion ${fold}  detJ ${det}`, 12, 18);
    if (proj.rec.pole) {
      const [x, y] = px(proj.rec.pole, w, h);
      ctx.strokeStyle = "#A66800";
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  drawRequestedEffective(ctx, w, h, proj);
}
