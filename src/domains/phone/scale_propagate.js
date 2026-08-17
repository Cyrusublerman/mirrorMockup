export class PhoneScale {
  distanceForFraction(f, width_m, hfov) {
    const frac = Math.max(1e-6, Number(f) || 0);
    const tanH = Math.tan((hfov || Math.PI / 3) / 2);
    return width_m / (4 * frac * tanH);
  }

  fractionForDistance(c, width_m, hfov) {
    const tanH = Math.tan((hfov || Math.PI / 3) / 2);
    const den = 4 * Math.max(1e-6, c) * tanH;
    return width_m / den;
  }

  solve({ c, f, width_m, hfov }) {
    if (f != null) {
      const nextC = this.distanceForFraction(f, width_m, hfov);
      return { c: nextC, f, delta_c: nextC - c };
    }
    return { c, f: this.fractionForDistance(c, width_m, hfov), delta_c: 0 };
  }
}
