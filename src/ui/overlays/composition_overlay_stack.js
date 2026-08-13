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

function landmarksAnkleClearance(proj) {
  const a = proj.targets?.find((t) => t.id === "reflected_ankle_L");
  const m = proj.targets?.find((t) => t.id === "mirror");
  if (!a?.requested || !m?.bbox?.br) return null;
  return m.bbox.br[1] - a.requested[1];
}

export function drawOverlays(ctx, w, h, workspace, proj) {
  const o = workspace.overlays;
  const targets = proj.targets || [];
  ctx.clearRect(0, 0, w, h);
  if (o.GRID) {
    ctx.save();
    ctx.strokeStyle = "rgba(24,24,24,0.18)";
    ctx.lineWidth = 1;
    const kind = o.GRID === "pixel" ? "pixel" : o.GRID === "custom" ? "custom" : o.GRID === true || o.GRID === "thirds" ? "thirds" : "norm";
    const n = kind === "pixel" ? 10 : kind === "custom" ? 5 : 3;
    for (let i = 1; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo((w * i) / n, 0);
      ctx.lineTo((w * i) / n, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (h * i) / n);
      ctx.lineTo(w, (h * i) / n);
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
    ctx.save();
    ctx.strokeStyle = "#395BD6";
    ctx.fillStyle = "#395BD6";
    ctx.font = "11px ui-sans-serif,system-ui,sans-serif";
    const phone = targets.find((t) => t.id === "phone");
    const head = targets.find((t) => t.id === "direct_head");
    const mir = targets.find((t) => t.id === "mirror");
    let y = 22;
    if (phone?.requested && phone?.effective) {
      ctx.fillText(`phone residual ${phone.residual?.toFixed(4) ?? "—"} IMAGE_NORM final`, 12, y);
      y += 14;
    }
    if (head?.bbox) {
      const bw = Math.abs(head.bbox.br[0] - head.bbox.tl[0]);
      const bh = Math.abs(head.bbox.br[1] - head.bbox.tl[1]);
      ctx.fillText(`head bbox ${bw.toFixed(3)}×${bh.toFixed(3)} frame`, 12, y);
      y += 14;
    }
    const dM = proj.effective?.apparatus?.d_M;
    if (Number.isFinite(dM)) ctx.fillText(`d_M ${dM.toFixed(3)} m`, 12, y);
    const ank = landmarksAnkleClearance(proj);
    if (ank != null) ctx.fillText(`ankle clearance ${ank.toFixed(3)} frame`, 12, y + 14);
    ctx.restore();
  }
  if (o.PERSPECTIVE) {
    ctx.save();
    ctx.strokeStyle = "rgba(57,91,214,0.55)";
    const crop = proj.requested?.camera?.crop_request;
    const pan = crop?.pan || [0, 0];
    const cx = (0.5 - pan[0]) * w;
    const cy = (0.5 - pan[1]) * h;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(0, h);
    ctx.moveTo(cx, 0);
    ctx.lineTo(w, h);
    ctx.stroke();
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = "#395BD6";
    ctx.font = "11px ui-sans-serif,system-ui,sans-serif";
    ctx.fillText(`principal capture (0.5,0.5)  crop pan ${pan[0].toFixed(3)},${pan[1].toFixed(3)}`, 12, h - 8);
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
