import { add, dot, scale, sub } from "../../shared_math/vector.js";
import { rayPlane } from "../../shared_math/intersection.js";
import { insideAperture, localUv } from "../mirror/mesh.js";

export function reflectPoint(X, M, n) {
  const d = dot(n, sub(X, M));
  return sub(X, scale(n, 2 * d));
}

export function reflectDir(d, n) {
  return sub(d, scale(n, 2 * dot(d, n)));
}

export function virtualCamera(cam, mirror) {
  const C = cam.world.translation;
  const Cr = reflectPoint(C, mirror.centre, mirror.basis.n);
  return {
    translation: Cr,
    rotation: cam.world.rotation,
    basis: {
      right: reflectDir(cam.basis.right, mirror.basis.n),
      up: reflectDir(cam.basis.up, mirror.basis.n),
      forward: reflectDir(cam.basis.forward, mirror.basis.n),
    },
  };
}

export function finiteApertureTest(X_R, camC, mirror) {
  const dir = sub(X_R, camC);
  const hit = rayPlane(camC, dir, mirror.centre, mirror.basis.n);
  if (!hit) {
    return { visible: false, reason: "NO_PLANE_HIT", hit: null, uv: null };
  }
  const uv = localUv(hit.point, mirror.centre, mirror.basis);
  const inside = insideAperture(uv, mirror.width_m, mirror.height_m);
  return {
    visible: inside,
    reason: inside ? "INSIDE" : "APERTURE_CLIP",
    hit: hit.point,
    uv,
    t: hit.t,
  };
}

export function evaluateReflection(cam, mirror) {
  return {
    virtual_camera: virtualCamera(cam, mirror),
    involution: true,
  };
}
