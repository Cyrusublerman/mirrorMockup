export function centralDifference(f, x, i, h = 1e-6) {
  const xp = x.slice();
  const xm = x.slice();
  xp[i] += h;
  xm[i] -= h;
  return (f(xp) - f(xm)) / (2 * h);
}

export function jacobian(f, x, m, h = 1e-6) {
  const J = [];
  for (let i = 0; i < m; i++) {
    J.push([]);
    const fi = (xx) => {
      const y = f(xx);
      return Array.isArray(y) ? y[i] : y;
    };
    for (let j = 0; j < x.length; j++) J[i][j] = centralDifference(fi, x, j, h);
  }
  return J;
}

export function det2(J) {
  return J[0][0] * J[1][1] - J[0][1] * J[1][0];
}

export function singularValues2(J) {
  const a = J[0][0], b = J[0][1], c = J[1][0], d = J[1][1];
  const ATA00 = a * a + c * c;
  const ATA01 = a * b + c * d;
  const ATA11 = b * b + d * d;
  const tr = ATA00 + ATA11;
  const det = ATA00 * ATA11 - ATA01 * ATA01;
  const disc = Math.max(0, tr * tr / 4 - det);
  const s1 = Math.sqrt(Math.max(0, tr / 2 + Math.sqrt(disc)));
  const s2 = Math.sqrt(Math.max(0, tr / 2 - Math.sqrt(disc)));
  return [Math.max(s1, s2), Math.min(s1, s2)];
}

export function anisotropy(J) {
  const [s1, s2] = singularValues2(J);
  if (s2 < 1e-15) return Infinity;
  return s1 / s2;
}
