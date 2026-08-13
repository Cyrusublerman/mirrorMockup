export function c(re = 0, im = 0) {
  return [re, im];
}

export function add(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

export function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

export function mul(a, b) {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

export function div(a, b) {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
}

export function abs(a) {
  return Math.hypot(a[0], a[1]);
}

export function arg(a) {
  return Math.atan2(a[1], a[0]);
}

export function exp(a) {
  const e = Math.exp(a[0]);
  return [e * Math.cos(a[1]), e * Math.sin(a[1])];
}

export function log(a) {
  return [Math.log(abs(a)), arg(a)];
}

export function scale(a, s) {
  return [a[0] * s, a[1] * s];
}

export function fromPolar(r, th) {
  return [r * Math.cos(th), r * Math.sin(th)];
}

export function reduceLattice(w, lambda1, lambda2) {
  let z = w.slice();
  for (let k = 0; k < 8; k++) {
    const a2 = (z[0] * lambda2[0] + z[1] * lambda2[1]) / (lambda2[0] ** 2 + lambda2[1] ** 2);
    const n2 = Math.round(a2);
    z = sub(z, scale(lambda2, n2));
    const a1 = (z[0] * lambda1[0] + z[1] * lambda1[1]) / (lambda1[0] ** 2 + lambda1[1] ** 2);
    const n1 = Math.round(a1);
    z = sub(z, scale(lambda1, n1));
  }
  return z;
}
