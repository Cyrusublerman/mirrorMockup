import { evaluatePhone } from "../phone/prism.js";
import { evaluateCamera } from "../camera/model.js";
import { evaluateApparatus } from "../apparatus/relation.js";
import { evaluateMirror } from "../mirror/mesh.js";
import { ScreenQuad } from "./screen_quad.js";

const sq = new ScreenQuad();

function projectCorner(req, index) {
  const phone = evaluatePhone(req);
  const cam = evaluateCamera(phone.world, req);
  const apparatus = evaluateApparatus(cam, req);
  const mirror = evaluateMirror(apparatus, req);
  const p = sq.evaluate(phone, cam, mirror);
  return p.quad?.[index] || null;
}

function getX(req) {
  const p = req.phone.transform_request;
  return [p.translation[0], p.translation[1], p.translation[2], p.yaw || 0, p.pitch || 0, p.roll || 0];
}
function setX(req, x) {
  req.phone.transform_request.translation = x.slice(0, 3);
  req.phone.transform_request.yaw = x[3];
  req.phone.transform_request.pitch = x[4];
  req.phone.transform_request.roll = x[5];
}

export function solveScreenCornerTransform(requested, index, targetUv, iterations = 6) {
  if (!(index >= 0 && index < 4) || !targetUv) throw new Error("screen corner solve requires a corner index and target UV");
  const req = structuredClone(requested);
  let x = getX(req);
  const h = [0.002, 0.002, 0.002, 0.004, 0.004, 0.004];
  // Translation is deliberately more expensive than rotation so an individual
  // corner drag changes projective shape instead of degenerating into whole-phone pan.
  const cost = [3, 4, 3, 1, 1, 1];
  for (let it = 0; it < iterations; it++) {
    setX(req, x);
    const p = projectCorner(req, index);
    if (!p) break;
    const err = [targetUv[0] - p[0], targetUv[1] - p[1]];
    if (Math.hypot(err[0], err[1]) < 2e-5) break;
    const J = [new Array(6).fill(0), new Array(6).fill(0)];
    for (let j = 0; j < 6; j++) {
      const xp = x.slice();
      xp[j] += h[j];
      setX(req, xp);
      const pp = projectCorner(req, index);
      if (!pp) continue;
      J[0][j] = (pp[0] - p[0]) / h[j] / cost[j];
      J[1][j] = (pp[1] - p[1]) / h[j] / cost[j];
    }
    const a00 = J[0].reduce((s, v) => s + v * v, 1e-6);
    const a01 = J[0].reduce((s, v, j) => s + v * J[1][j], 0);
    const a11 = J[1].reduce((s, v) => s + v * v, 1e-6);
    const det = a00 * a11 - a01 * a01;
    if (Math.abs(det) < 1e-12) break;
    const y0 = (a11 * err[0] - a01 * err[1]) / det;
    const y1 = (-a01 * err[0] + a00 * err[1]) / det;
    for (let j = 0; j < 6; j++) {
      let dx = (J[0][j] * y0 + J[1][j] * y1) / cost[j];
      const lim = j < 3 ? 0.035 : 0.08;
      dx = Math.max(-lim, Math.min(lim, dx));
      x[j] += dx;
    }
  }
  setX(req, x);
  const finalUv = projectCorner(req, index);
  return {
    translation: x.slice(0, 3),
    yaw: x[3],
    pitch: x[4],
    roll: x[5],
    corner: index,
    target_uv: targetUv.slice(),
    achieved_uv: finalUv,
    residual: finalUv ? Math.hypot(finalUv[0] - targetUv[0], finalUv[1] - targetUv[1]) : Infinity,
  };
}
