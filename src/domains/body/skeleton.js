import MAP from "../../../fixtures/P0/skeleton_map.json" with { type: "json" };
import GLB_NODES from "../../../fixtures/P0/glb_nodes.json" with { type: "json" };
import * as quat from "../../shared_math/quaternion.js";
import * as xform from "../../shared_math/transform.js";
import { twoLinkIk } from "../../shared_math/numerical.js";
import { distance } from "../../shared_math/vector.js";

export const SEMANTIC = MAP.semantic_to_glb;

function nodeByName(name) {
  return GLB_NODES.nodes.find((n) => n.name === name);
}

export function restLocals() {
  const locals = {};
  for (const n of GLB_NODES.nodes) {
    locals[n.name] = {
      translation: n.translation.slice(),
      rotation: n.rotation.slice(),
      scale: n.scale.slice(),
      children: n.children.slice(),
      index: n.index,
    };
  }
  return locals;
}

export function applyPoseRotations(locals, poseRotations) {
  const out = {};
  for (const [k, v] of Object.entries(locals)) {
    out[k] = {
      translation: v.translation.slice(),
      rotation: v.rotation.slice(),
      scale: v.scale.slice(),
      children: v.children,
      index: v.index,
    };
  }
  for (const [semantic, q] of Object.entries(poseRotations)) {
    const glb = SEMANTIC[semantic];
    if (glb && out[glb]) out[glb].rotation = q.slice();
  }
  return out;
}

export function forwardKinematics(locals, rootWorld) {
  const world = {};
  function walk(index, parentWorld) {
    const node = GLB_NODES.nodes[index];
    const local = locals[node.name];
    const xf = xform.compose(parentWorld, {
      translation: local.translation,
      rotation: local.rotation,
      scale: local.scale,
    });
    world[node.name] = xf;
    for (const c of node.children || []) walk(c, xf);
  }
  walk(GLB_NODES.skeleton_root, rootWorld);
  const fk = {};
  for (const [sem, glb] of Object.entries(SEMANTIC)) {
    if (world[glb]) fk[sem] = world[glb].translation;
  }
  return { world, fk };
}

export function p0RootWorld(requested) {
  const t = requested.body.pose_targets.root.translation;
  const yaw = requested.body.pose_targets.root.yaw;
  return {
    translation: t.slice(),
    rotation: quat.fromAxisAngle([0, 0, 1], yaw),
    scale: [1, 1, 1],
  };
}

export function p0PoseRotations() {
  return {
    elbow_R: quat.fromAxisAngle([1, 0, 0], ((180 - 132.95) * Math.PI) / 180),
    knee_L: quat.fromAxisAngle([1, 0, 0], ((180 - 178.21) * Math.PI) / 180),
    knee_R: quat.fromAxisAngle([1, 0, 0], ((180 - 174.01) * Math.PI) / 180),
    shoulder_R: quat.fromAxisAngle([0, 0, 1], -0.6),
  };
}

export function solveArmIk(fkWorld, locals, chain, target, branch) {
  const [sh, el, wr] = chain;
  const S = fkWorld[SEMANTIC[sh]].translation;
  const E0 = fkWorld[SEMANTIC[el]].translation;
  const W0 = fkWorld[SEMANTIC[wr]].translation;
  const L1 = distance(S, E0);
  const L2 = distance(E0, W0);
  const n = [0, 0, 1];
  return twoLinkIk(S, target, L1, L2, n, branch);
}

export function evaluateSkeleton(requested) {
  const locals = applyPoseRotations(restLocals(), {
    ...p0PoseRotations(),
    ...requested.body.pose_targets.bend_tilt_twist,
  });
  const root = p0RootWorld(requested);
  const { world, fk } = forwardKinematics(locals, root);
  return { locals, world, fk, glb: requested.body.definition.glb, map: MAP };
}
