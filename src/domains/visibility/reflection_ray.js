import { sub } from "../../shared_math/vector.js";
import { rayPlane } from "../../shared_math/intersection.js";
import { insideAperture, localUv } from "../mirror/mesh.js";
import { reflectPoint } from "../reflection/reflect.js";

export const RAY_STATE = Object.freeze({
  VISIBLE: "VISIBLE",
  NO_MIRROR_INTERSECTION: "NO_MIRROR_INTERSECTION",
  OUTSIDE_APERTURE: "OUTSIDE_APERTURE",
  OCCLUDED_CAMERA_TO_MIRROR: "OCCLUDED_CAMERA_TO_MIRROR",
  OCCLUDED_MIRROR_TO_TARGET: "OCCLUDED_MIRROR_TO_TARGET",
});

export class ReflectionRay {
  trace(X, camC, mirror, occluders = [], occludes = null) {
    const Xr = reflectPoint(X, mirror.centre, mirror.basis.n);
    const dir = sub(Xr, camC);
    const hit = rayPlane(camC, dir, mirror.centre, mirror.basis.n);
    if (!hit) {
      return { state: RAY_STATE.NO_MIRROR_INTERSECTION, visible: false, hit: null, uv: null, world_reflected: Xr };
    }
    const uv = localUv(hit.point, mirror.centre, mirror.basis);
    if (!insideAperture(uv, mirror.width_m, mirror.height_m)) {
      return { state: RAY_STATE.OUTSIDE_APERTURE, visible: false, hit: hit.point, uv, world_reflected: Xr };
    }
    for (const occ of occluders) {
      if (!occ?.mesh || !occ?.world || !occludes) continue;
      if (occludes(camC, hit.point, occ.mesh, occ.world)) {
        return { state: RAY_STATE.OCCLUDED_CAMERA_TO_MIRROR, visible: false, hit: hit.point, uv, world_reflected: Xr };
      }
      if (occludes(hit.point, X, occ.mesh, occ.world)) {
        return { state: RAY_STATE.OCCLUDED_MIRROR_TO_TARGET, visible: false, hit: hit.point, uv, world_reflected: Xr };
      }
    }
    return { state: RAY_STATE.VISIBLE, visible: true, hit: hit.point, uv, world_reflected: Xr };
  }
}
