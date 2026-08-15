export const MASK_LABELS = Object.freeze({
  0: "clear",
  1: "direct_hair",
  2: "direct_face",
  3: "direct_body",
  4: "mirror",
  5: "reflected_torso",
  6: "reflected_legs",
  7: "reflected_phone",
});

export class MaskExtract {
  read(labels) {
    const counts = {};
    for (const v of labels) counts[v] = (counts[v] || 0) + 1;
    const n = labels.length || 1;
    const occupancy = {};
    for (const [k, name] of Object.entries(MASK_LABELS)) {
      occupancy[name] = (counts[Number(k)] || 0) / n;
    }
    return { occupancy, counts, n };
  }
}

export class MaskRender {
  render(visibility, carrierP, mirrorQuad, w, h) {
    const labels = new Uint8Array(w * h);
    const reports = visibility?.reports || {};
    const stamp = (uv, code, rad = 0.06) => {
      if (!uv) return;
      const cx = Math.round(uv[0] * (w - 1));
      const cy = Math.round(uv[1] * (h - 1));
      const r = Math.max(1, Math.round(rad * w));
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) labels[y * w + x] = code;
        }
      }
    };
    if (mirrorQuad) {
      for (const p of mirrorQuad) stamp(p, 4, 0.12);
    }
    stamp(reports.head?.direct?.image_norm, 2, 0.08);
    stamp(reports.pelvis?.direct?.image_norm, 3, 0.1);
    stamp(reports.pelvis?.reflected?.projection?.image_norm, 5, 0.07);
    stamp(reports.ankle_L?.reflected?.projection?.image_norm, 6, 0.05);
    stamp(reports.ankle_R?.reflected?.projection?.image_norm, 6, 0.05);
    if (carrierP?.quad) {
      const c = carrierP.quad.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
      stamp(c, 7, 0.03);
    }
    return labels;
  }
}
