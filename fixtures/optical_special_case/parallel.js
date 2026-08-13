export function sameAnatomyScale(a, d) {
  return a / (a + 2 * d);
}

export function reflectedVirtualDepth(a, d) {
  return a + 2 * d;
}

export function directVisibleHeight(a, vfov) {
  return 2 * a * Math.tan(vfov / 2);
}

export function reflectedVisibleHeight(L_M, a, d) {
  return L_M * ((a + 2 * d) / (a + d));
}

export function nuD(a, vfov, H_B) {
  return directVisibleHeight(a, vfov) / H_B;
}

export function nuR(L_M, a, d, H_B) {
  return reflectedVisibleHeight(L_M, a, d) / H_B;
}
