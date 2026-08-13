import { add, copy, cross, dot, normalize, scale, sub, vec3 } from "./vector.js";
import * as quat from "./quaternion.js";

export function identity() {
  return {
    translation: [0, 0, 0],
    rotation: quat.identity(),
    scale: [1, 1, 1],
  };
}

export function compose(parent, local) {
  const r = quat.multiply(parent.rotation, local.rotation);
  const scaled = [
    local.translation[0] * parent.scale[0],
    local.translation[1] * parent.scale[1],
    local.translation[2] * parent.scale[2],
  ];
  const t = add(parent.translation, quat.rotateVec(parent.rotation, scaled));
  return {
    translation: t,
    rotation: r,
    scale: [
      parent.scale[0] * local.scale[0],
      parent.scale[1] * local.scale[1],
      parent.scale[2] * local.scale[2],
    ],
  };
}

export function invert(xf) {
  const invR = quat.invert(xf.rotation);
  const invS = [1 / xf.scale[0], 1 / xf.scale[1], 1 / xf.scale[2]];
  const t = quat.rotateVec(invR, scale(xf.translation, -1));
  return {
    translation: [t[0] * invS[0], t[1] * invS[1], t[2] * invS[2]],
    rotation: invR,
    scale: invS,
  };
}

export function transformPoint(xf, p) {
  const s = [p[0] * xf.scale[0], p[1] * xf.scale[1], p[2] * xf.scale[2]];
  return add(xf.translation, quat.rotateVec(xf.rotation, s));
}

export function transformDir(xf, d) {
  return quat.rotateVec(xf.rotation, d);
}

export function lookAt(origin, target, up = [0, 0, 1]) {
  const forward = normalize(sub(target, origin));
  let right = normalize(cross(up, forward));
  if (Math.hypot(...right) < 1e-8) {
    right = normalize(cross([1, 0, 0], forward));
  }
  const trueUp = cross(forward, right);
  const m = [
    right[0], trueUp[0], forward[0],
    right[1], trueUp[1], forward[1],
    right[2], trueUp[2], forward[2],
  ];
  return {
    translation: copy(origin),
    rotation: quat.fromMat3(m),
    scale: [1, 1, 1],
  };
}

export function basis(xf) {
  return {
    right: quat.rotateVec(xf.rotation, [1, 0, 0]),
    up: quat.rotateVec(xf.rotation, [0, 0, 1]),
    forward: quat.rotateVec(xf.rotation, [0, 1, 0]),
  };
}

export function fromTranslation(t) {
  return { translation: copy(t), rotation: quat.identity(), scale: [1, 1, 1] };
}

export { vec3 };
