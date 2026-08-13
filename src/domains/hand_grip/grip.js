import { transformPoint } from "../../shared_math/transform.js";

const DEFAULT_PALM_LOCAL = [0, -0.02, -0.01];

function isZeroOffset(offset) {
  return !offset || (offset[0] === 0 && offset[1] === 0 && offset[2] === 0);
}

export function evaluateGrip(phoneEval, requested) {
  const grip_world = phoneEval.grip_world;
  const offset = requested.phone.grip_relation.offset;
  const phoneWorld = phoneEval.world || grip_world;
  const wrist_target = isZeroOffset(offset)
    ? transformPoint(phoneWorld, DEFAULT_PALM_LOCAL)
    : grip_world.translation.slice();
  return {
    authority: requested.phone.authority,
    grip_world,
    wrist_target,
    contacts: ["palm", "index", "middle", "ring", "thumb"],
  };
}
