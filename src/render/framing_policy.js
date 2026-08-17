export class FramingPolicy {
  constructor() {
    this.margin = 0.12;
  }

  boundsOf(points) {
    if (!points?.length) return null;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const p of points) {
      if (!p) continue;
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], p[i]);
        max[i] = Math.max(max[i], p[i]);
      }
    }
    const centre = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 0.4);
    return { centre, size, min, max };
  }

  fitBody(fk, margin = this.margin) {
    const pts = Object.values(fk || {}).filter((p) => Array.isArray(p) && p.length === 3);
    const b = this.boundsOf(pts);
    if (!b) return { target: [0, 0.9, 0.9], radius: 2.4 };
    // FK bounds stop at joint centres; the skinned silhouette extends beyond the
    // crown, shoulders, hands and feet. Include that envelope so every canonical
    // editor view contains the complete visible body rather than clipping skin.
    return { target: b.centre, radius: b.size * (1.08 + margin) };
  }

  fitApparatus(eff, margin = this.margin) {
    const pts = [];
    const fk = eff.skeleton?.fk;
    if (fk) pts.push(...Object.values(fk).filter((p) => Array.isArray(p) && p.length === 3));
    if (eff.phone?.world?.translation) pts.push(eff.phone.world.translation);
    if (eff.mirror?.centre) pts.push(eff.mirror.centre);
    const b = this.boundsOf(pts);
    if (!b) return { target: [0, 0.9, 0.9], radius: 3.2 };
    return { target: b.centre, radius: b.size * (1.05 + margin) };
  }

  fitSelection(point, margin = this.margin) {
    if (!point) return { target: [0, 0.9, 0.9], radius: 1.2 };
    return { target: point.slice(), radius: 0.9 * (1 + margin) };
  }
}
