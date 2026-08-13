export function recursionChrome(proj) {
  const p = proj.portal?.P;
  const ok = p && p.valid !== false;
  return {
    hint: ok
      ? "P is derived from the reflected screen  ·  Q lives in that portal"
      : "P invalid — AUTO refused until the reflected screen is on-canvas",
  };
}
