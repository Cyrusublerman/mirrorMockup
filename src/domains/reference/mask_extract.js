import { projectWorld } from "../visibility/report.js";
import { reflectPoint } from "../reflection/reflect.js";

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
    for (const [k, name] of Object.entries(MASK_LABELS)) occupancy[name] = (counts[Number(k)] || 0) / n;
    return { occupancy, counts, n };
  }
}

function pointInPoly(x, y, q) {
  let c = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    const a = q[i], b = q[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / ((b[1] - a[1]) || 1e-12) + a[0]) c = !c;
  }
  return c;
}

function fillPoly(labels, w, h, uv, code) {
  if (!uv?.length || uv.some((p) => !p)) return;
  const q = uv.map((p) => [p[0] * w, p[1] * h]);
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (pointInPoly(x + 0.5, y + 0.5, q)) labels[y * w + x] = code;
}

function stamp(labels, w, h, uv, rx, ry, code) {
  if (!uv) return;
  const cx = uv[0] * w, cy = uv[1] * h;
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(w - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(h - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - cx) / Math.max(rx, 1), dy = (y + 0.5 - cy) / Math.max(ry, 1);
    if (dx * dx + dy * dy <= 1) labels[y * w + x] = code;
  }
}

function projectedRadius(point, radius, cam, w) {
  if (!point || !(radius > 0)) return 2;
  const p0 = projectWorld(point, cam).image_norm;
  const p1 = projectWorld([point[0] + radius, point[1], point[2]], cam).image_norm;
  if (!p0 || !p1) return 2;
  return Math.max(1, Math.abs(p1[0] - p0[0]) * w);
}

function regionCentre(region) {
  if (region.centre) return region.centre;
  if (region.a && region.b) return [(region.a[0]+region.b[0])/2,(region.a[1]+region.b[1])/2,(region.a[2]+region.b[2])/2];
  return null;
}

function regionRadius(region) {
  if (region.radii) return Math.max(...region.radii);
  if (region.radius) return region.radius;
  return 0.05;
}

function directCode(id) {
  if (id === "direct_hair") return 1;
  if (id === "direct_face") return 2;
  return 3;
}

function reflectedCode(region) {
  const s = String(region.source || "");
  return /thigh|shin|leg/.test(s) ? 6 : 5;
}

export class MaskRender {
  render(contour, cam, mirror, carrierP, mirrorQuad, w, h) {
    if (!contour || contour.layer !== "CONTOUR") throw new Error("MaskRender requires CONTOUR as its body source");
    const labels = new Uint8Array(w * h);
    if (mirrorQuad) fillPoly(labels, w, h, mirrorQuad, 4);

    // Reflected body sits behind the mirror aperture and before the direct body.
    for (const region of contour.regions || []) {
      if (region.id === "direct_hair" || region.id === "direct_face") continue;
      const centre = regionCentre(region);
      if (!centre) continue;
      const xr = reflectPoint(centre, mirror.centre, mirror.basis.n);
      const uv = projectWorld(xr, cam).image_norm;
      const rpx = projectedRadius(xr, regionRadius(region), cam, w);
      stamp(labels, w, h, uv, rpx, rpx * 1.35, reflectedCode(region));
    }
    if (carrierP?.quad) fillPoly(labels, w, h, carrierP.quad, 7);

    for (const region of contour.regions || []) {
      const centre = regionCentre(region);
      if (!centre) continue;
      const uv = projectWorld(centre, cam).image_norm;
      const rpx = projectedRadius(centre, regionRadius(region), cam, w);
      stamp(labels, w, h, uv, rpx, rpx * 1.35, directCode(region.id));
    }
    return labels;
  }
}
