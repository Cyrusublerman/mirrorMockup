import { PANELS_AI, PART_WEIGHTS } from "../../../fixtures/reference/panels_ai.js";

export class MaskCompare {
  iou(pred, ref) {
    let inter = 0;
    let union = 0;
    const n = Math.min(pred.length, ref.length);
    for (let i = 0; i < n; i++) {
      if (pred[i] === ref[i] && pred[i] !== 0) inter++;
      if (pred[i] !== 0 || ref[i] !== 0) union++;
    }
    return union === 0 ? 1 : inter / union;
  }

  perPart(pred, ref, labels) {
    const out = {};
    for (const lab of labels) {
      const p = pred.map((v) => (v === lab ? lab : 0));
      const r = ref.map((v) => (v === lab ? lab : 0));
      out[lab] = this.iou(p, r);
    }
    return out;
  }

  weighted(parts, weights = PART_WEIGHTS) {
    let num = 0;
    let den = 0;
    for (const [k, v] of Object.entries(parts)) {
      const w = weights[k] ?? 1;
      num += w * v;
      den += w;
    }
    return den === 0 ? 0 : num / den;
  }

  occupancyResidual(panelId, measured) {
    const row = PANELS_AI[panelId];
    if (!row) return null;
    const keys = ["mirror", "direct_body", "reflected_body"];
    const parts = {};
    for (const k of keys) {
      const a = measured[k] ?? 0;
      const b = row[k];
      const union = Math.max(a, b, 1e-9);
      parts[k] = 1 - Math.abs(a - b) / union;
    }
    return { panel: panelId, parts, weighted: this.weighted(parts, { mirror: 1, direct_body: 1, reflected_body: 0.45 }) };
  }

  panels() {
    return PANELS_AI;
  }
}
