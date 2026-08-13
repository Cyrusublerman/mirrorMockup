import { add, scale, sub } from "../../shared_math/vector.js";

export function apertureCorners(centre, basis, width, height) {
  const hx = width / 2;
  const hy = height / 2;
  const u = basis.u;
  const v = basis.v;
  return [
    add(add(centre, scale(u, -hx)), scale(v, hy)),
    add(add(centre, scale(u, hx)), scale(v, hy)),
    add(add(centre, scale(u, hx)), scale(v, -hy)),
    add(add(centre, scale(u, -hx)), scale(v, -hy)),
  ];
}

export function mirrorMesh(centre, basis, width, height, thickness = 0.008) {
  const front = apertureCorners(centre, basis, width, height);
  const back = front.map((p) => add(p, scale(basis.n, -thickness)));
  const positions = [...front, ...back];
  const triangles = [
    [0, 1, 2], [0, 2, 3],
    [4, 6, 5], [4, 7, 6],
    [0, 4, 5], [0, 5, 1],
    [1, 5, 6], [1, 6, 2],
    [2, 6, 7], [2, 7, 3],
    [3, 7, 4], [3, 4, 0],
  ];
  return {
    kind: "aperture_slab",
    positions,
    triangles,
    quad: front,
  };
}

export function localUv(point, centre, basis) {
  const d = sub(point, centre);
  return [
    d[0] * basis.u[0] + d[1] * basis.u[1] + d[2] * basis.u[2],
    d[0] * basis.v[0] + d[1] * basis.v[1] + d[2] * basis.v[2],
  ];
}

export function insideAperture(uv, width, height) {
  return Math.abs(uv[0]) <= width / 2 && Math.abs(uv[1]) <= height / 2;
}

export function fitAperture(hits, margin) {
  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  for (const h of hits) {
    minU = Math.min(minU, h[0]);
    minV = Math.min(minV, h[1]);
    maxU = Math.max(maxU, h[0]);
    maxV = Math.max(maxV, h[1]);
  }
  return {
    width: maxU - minU + 2 * margin,
    height: maxV - minV + 2 * margin,
  };
}

export function evaluateMirror(apparatus, requested) {
  const width = requested.mirror.width_m;
  const height = requested.mirror.height_m;
  const mesh = mirrorMesh(
    apparatus.centre,
    apparatus.basis,
    width,
    height,
    requested.mirror.thickness_m,
  );
  return {
    centre: apparatus.centre,
    basis: apparatus.basis,
    width_m: width,
    height_m: height,
    mesh,
    quad: mesh.quad,
  };
}
