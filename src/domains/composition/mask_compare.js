import { PANELS_AI, PART_WEIGHTS } from "../../../fixtures/reference/panels_ai.js";
import { declaredReferenceMask, DECLARED_MASK_VERSION, MASK_CODE } from "../../../fixtures/reference/declared_masks.js";
import { maskAcceptanceFixture, MASK_ACCEPTANCE_VERSION } from "../../../fixtures/reference/mask_acceptance.js";
import { MaskRender } from "../reference/mask_extract.js";

export class MaskCompare {
  iou(pred, ref, label = null) {
    let inter = 0;
    let union = 0;
    const n = Math.min(pred.length, ref.length);
    for (let i = 0; i < n; i++) {
      const p = label == null ? pred[i] !== 0 : pred[i] === label;
      const r = label == null ? ref[i] !== 0 : ref[i] === label;
      if (p && r) inter++;
      if (p || r) union++;
    }
    return union === 0 ? 1 : inter / union;
  }

  perPart(pred, ref, labels) {
    const out = {};
    for (const lab of labels) out[lab] = this.iou(pred, ref, lab);
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

  compareDeclared(pred, width, height) {
    const ref = declaredReferenceMask(width, height);
    const byName = {};
    const byLabel = this.perPart(pred, ref.labels, Object.values(MASK_CODE).filter((v) => v !== 0));
    for (const [name, code] of Object.entries(MASK_CODE)) {
      if (code === 0) continue;
      byName[name] = byLabel[code];
    }
    return {
      reference_id: ref.id,
      reference_version: DECLARED_MASK_VERSION,
      parts: byName,
      weighted: this.weighted(byName),
    };
  }

  certifyRenderer() {
    const f = maskAcceptanceFixture();
    const renderer = new MaskRender();
    const pred = renderer.render(f.contour, f.camera, f.mirror, f.carrier_p, f.mirror_quad, f.width, f.height);
    const byName = {};
    const byLabel = this.perPart(pred, f.reference_labels, Object.values(MASK_CODE).filter((v) => v !== 0));
    for (const [name, code] of Object.entries(MASK_CODE)) {
      if (code === 0) continue;
      byName[name] = byLabel[code];
    }
    return {
      reference_id: f.id,
      reference_version: MASK_ACCEPTANCE_VERSION,
      parts: byName,
      weighted: this.weighted(byName),
      production_renderer: true,
    };
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
