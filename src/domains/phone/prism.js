import { add, scale, sub, vec3 } from "../../shared_math/vector.js";
import * as quat from "../../shared_math/quaternion.js";
import * as xform from "../../shared_math/transform.js";

export const PHONE_LOCAL = Object.freeze({
  right: [1, 0, 0],
  screen_normal: [0, 1, 0],
  up: [0, 0, 1],
});

export function phoneWorldTransform(phoneRequest) {
  const t = phoneRequest.transform_request.translation;
  const r = quat.yawPitchRoll(
    phoneRequest.transform_request.yaw,
    phoneRequest.transform_request.pitch,
    phoneRequest.transform_request.roll,
  );
  return { translation: t.slice(), rotation: r, scale: [1, 1, 1] };
}

export function localScreenCorners(dims, inset) {
  const hx = dims.width / 2;
  const hy = dims.height / 2;
  const z = dims.depth / 2;
  const l = -hx + inset.left;
  const r = hx - inset.right;
  const t = hy - inset.top;
  const b = -hy + inset.bottom;
  return [
    [l, z, t],
    [r, z, t],
    [r, z, b],
    [l, z, b],
  ];
}

export function prismCorners(dims) {
  const hx = dims.width / 2;
  const hy = dims.height / 2;
  const hz = dims.depth / 2;
  const c = [];
  for (const x of [-hx, hx]) for (const y of [-hz, hz]) for (const z of [-hy, hy]) c.push([x, y, z]);
  return c;
}

export function prismMesh(dims) {
  const hx = dims.width / 2;
  const hy = dims.height / 2;
  const hz = dims.depth / 2;
  const positions = [
    [-hx, -hz, -hy], [hx, -hz, -hy], [hx, hz, -hy], [-hx, hz, -hy],
    [-hx, -hz, hy], [hx, -hz, hy], [hx, hz, hy], [-hx, hz, hy],
  ];
  const faces = [
    [0, 1, 2, 3],
    [4, 7, 6, 5],
    [0, 4, 5, 1],
    [2, 6, 7, 3],
    [0, 3, 7, 4],
    [1, 5, 6, 2],
  ];
  const triangles = [];
  for (const f of faces) {
    triangles.push([f[0], f[1], f[2]], [f[0], f[2], f[3]]);
  }
  return { positions, triangles, kind: "rectangular_prism" };
}

export function screenMesh(dims, inset) {
  const lift = 4e-4;
  const positions = localScreenCorners(dims, inset).map((p) => [p[0], p[1] + lift, p[2]]);
  return {
    kind: "screen_quad",
    positions,
    triangles: [
      [0, 1, 2],
      [0, 2, 3],
    ],
  };
}

export function worldCorners(localCorners, worldXf) {
  return localCorners.map((p) => xform.transformPoint(worldXf, p));
}

export function phoneFromWrist(wristWorld, gripRelation) {
  const gripLocal = {
    translation: (gripRelation?.offset || [0, 0, 0]).slice(),
    rotation: (gripRelation?.rotation || [0, 0, 0, 1]).slice(),
    scale: [1, 1, 1],
  };
  const gripWorld = {
    translation: wristWorld.translation.slice(),
    rotation: wristWorld.rotation.slice(),
    scale: [1, 1, 1],
  };
  return xform.compose(gripWorld, xform.invert(gripLocal));
}

export function evaluatePhone(requested, worldOverride) {
  const world = worldOverride || phoneWorldTransform(requested.phone);
  const dims = requested.phone.body_dimensions_m;
  const inset = requested.phone.screen_inset_m;
  const screenLocal = localScreenCorners(dims, inset);
  const screen_normal = quat.rotateVec(world.rotation, PHONE_LOCAL.screen_normal);
  return {
    world,
    mesh: prismMesh(dims),
    screen_mesh: screenMesh(dims, inset),
    screen_corners_local: screenLocal,
    screen_inset: inset,
    screen_corners_world: worldCorners(screenLocal, world),
    prism_corners_world: worldCorners(prismCorners(dims), world),
    screen_normal,
    mount: "FRONT",
    grip_world: xform.compose(world, {
      translation: requested.phone.grip_relation.offset,
      rotation: requested.phone.grip_relation.rotation,
      scale: [1, 1, 1],
    }),
  };
}
