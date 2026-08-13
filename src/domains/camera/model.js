import * as quat from "../../shared_math/quaternion.js";
import { add, scale } from "../../shared_math/vector.js";
import { fxFromHfov } from "../../shared_math/projection.js";
import * as xform from "../../shared_math/transform.js";

export function cameraLocalTransform(requested) {
  const off = requested.camera.optical_offset_local;
  return {
    translation: off.slice(),
    rotation: quat.identity(),
    scale: [1, 1, 1],
  };
}

export function captureCameraWorld(phoneWorld, requested) {
  const local = cameraLocalTransform(requested);
  return xform.compose(phoneWorld, local);
}

export function cameraBasis(camWorld) {
  return {
    right: quat.rotateVec(camWorld.rotation, [1, 0, 0]),
    up: quat.rotateVec(camWorld.rotation, [0, 0, 1]),
    forward: quat.rotateVec(camWorld.rotation, [0, 1, 0]),
  };
}

export function intrinsics(requested) {
  const W = requested.camera.crop_request.width_px;
  const H = requested.camera.crop_request.height_px;
  const hfov = requested.camera.hfov_request;
  const fx = fxFromHfov(W, hfov);
  const fy = fx;
  return { fx, fy, cx: W / 2, cy: H / 2, width_px: W, height_px: H, hfov };
}

export function evaluateCamera(phoneWorld, requested) {
  const world = captureCameraWorld(phoneWorld, requested);
  const basis = cameraBasis(world);
  const K = intrinsics(requested);
  return { world, basis, ...K, epistemic_status: requested.camera.epistemic_status };
}
