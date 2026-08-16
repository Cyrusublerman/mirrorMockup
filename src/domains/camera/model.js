import * as quat from "../../shared_math/quaternion.js";
import { fxFromHfov, vfovFromHfov } from "../../shared_math/projection.js";
import * as xform from "../../shared_math/transform.js";
import { PHONE_LOCAL } from "../phone/prism.js";

export function cameraLocalTransform(requested) {
  const off = requested.camera.optical_offset_local;
  return {
    translation: off.slice(),
    rotation: quat.identity(),
    scale: [1, 1, 1],
  };
}

export function captureCameraWorld(phoneWorld, requested) {
  const camera = requested.camera || {};
  const ext = camera.topology_request === "CAMERA_BETWEEN" ? camera.external_transform_request : null;
  if (ext?.translation && ext?.rotation) {
    return {
      translation: ext.translation.slice(),
      rotation: ext.rotation.slice(),
      scale: (ext.scale || [1, 1, 1]).slice(),
    };
  }
  const local = cameraLocalTransform(requested);
  return xform.compose(phoneWorld, local);
}

export function cameraBasis(camWorld) {
  return {
    right: quat.rotateVec(camWorld.rotation, PHONE_LOCAL.right),
    up: quat.rotateVec(camWorld.rotation, PHONE_LOCAL.up),
    forward: quat.rotateVec(camWorld.rotation, PHONE_LOCAL.screen_normal),
  };
}

export function intrinsics(requested) {
  const W = requested.camera.crop_request.width_px;
  const H = requested.camera.crop_request.height_px;
  const hfov = requested.camera.hfov_request;
  const fx = fxFromHfov(W, hfov);
  const fy = fx;
  const pan = requested.camera.crop_request.pan || [0, 0];
  return {
    fx,
    fy,
    cx: W / 2,
    cy: H / 2,
    width_px: W,
    height_px: H,
    hfov,
    vfov: vfovFromHfov(hfov, W, H),
    crop_pan: pan.slice(),
  };
}

export function evaluateCamera(phoneWorld, requested) {
  const external = requested.camera?.topology_request === "CAMERA_BETWEEN";
  const world = captureCameraWorld(phoneWorld, requested);
  const basis = cameraBasis(world);
  const K = intrinsics(requested);
  const rec = requested.camera.calibration_record || {};
  const distortion = rec.distortion || [0, 0, 0, 0, 0];
  const distortion_status = rec.distortion ? "CALIBRATED" : "UNCALIBRATED_ZERO";
  return {
    world,
    basis,
    ...K,
    crop_request: { ...requested.camera.crop_request },
    distortion,
    distortion_status,
    epistemic_status: requested.camera.epistemic_status,
    mount: external ? "EXTERNAL" : "FRONT",
    same_side_as_screen: !external,
  };
}
