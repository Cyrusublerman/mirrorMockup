import { add, dot, scale, sub } from "./vector.js";

export function pinholeProject(X, C, right, up, forward, fx, fy, cx, cy) {
  const D = sub(X, C);
  const Xc = dot(D, right);
  const Yc = dot(D, up);
  const Zc = dot(D, forward);
  if (Zc <= 1e-9) {
    return { u: NaN, v: NaN, depth: Zc, valid: false };
  }
  return {
    u: fx * (Xc / Zc) + cx,
    v: fy * (Yc / Zc) + cy,
    depth: Zc,
    camera: [Xc, Yc, Zc],
    valid: true,
  };
}

export function fxFromHfov(widthPx, hfov) {
  return widthPx / (2 * Math.tan(hfov / 2));
}

export function hfovFromFx(widthPx, fx) {
  return 2 * Math.atan(widthPx / (2 * fx));
}

export function vfovFromHfov(hfov, widthPx, heightPx) {
  return 2 * Math.atan((heightPx / widthPx) * Math.tan(hfov / 2));
}

export function imageNormFromPx(u, v, widthPx, heightPx) {
  return [u / widthPx, v / heightPx];
}

export function pxFromImageNorm(x, y, widthPx, heightPx) {
  return [x * widthPx, y * heightPx];
}

export function unprojectRay(u, v, C, right, up, forward, fx, fy, cx, cy) {
  const x = (u - cx) / fx;
  const y = (v - cy) / fy;
  const dir = add(add(scale(right, x), scale(up, y)), forward);
  return { origin: C, direction: dir };
}
