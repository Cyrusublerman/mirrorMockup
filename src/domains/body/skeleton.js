import MAP from "../../../fixtures/P0/skeleton_map.js";
import GLB_NODES from "../../../fixtures/P0/glb_nodes.js";
import * as quat from "../../shared_math/quaternion.js";
import * as xform from "../../shared_math/transform.js";
import { twoLinkIk } from "../../shared_math/numerical.js";
import { add, distance, dot, normalize, sub } from "../../shared_math/vector.js";

export const SEMANTIC = MAP.semantic_to_glb;

export const BONE_PARENT = (() => {
  const p = {};
  for (const n of GLB_NODES.nodes) {
    for (const c of n.children || []) p[GLB_NODES.nodes[c].name] = n.name;
  }
  return p;
})();

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

export function applyPoseRotations(locals, poseDeltas) {
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
  for (const [semantic, q] of Object.entries(poseDeltas)) {
    const glb = SEMANTIC[semantic] || semantic;
    if (!out[glb]) continue;
    out[glb].rotation = quat.normalize(quat.multiply(out[glb].rotation, q));
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

function restStatureM() {
  const locals = restLocals();
  const { fk } = forwardKinematics(locals, {
    translation: [0, 0, 0],
    rotation: quat.identity(),
    scale: [1, 1, 1],
  });
  const zs = ["toe_L", "toe_R", "ankle_L", "ankle_R"].map((k) => fk[k]?.[2]).filter((z) => Number.isFinite(z));
  const minZ = zs.length ? Math.min(...zs) : 0;
  return (fk.head?.[2] ?? 1.6) - minZ;
}

const REST_STATURE_M = restStatureM();

export function measuredStature(fk) {
  if (!fk?.head) return REST_STATURE_M;
  const zs = ["toe_L", "toe_R", "ankle_L", "ankle_R"].map((k) => fk[k]?.[2]).filter((z) => Number.isFinite(z));
  const minZ = zs.length ? Math.min(...zs) : 0;
  return fk.head[2] - minZ;
}

function modelScale(requested) {
  const labelled = requested.body?.definition?.stature;
  const base = requested.body?.definition?.model_adapter?.base_height_m;
  if (!(labelled > 0) || !(base > 0)) return 1;
  return labelled / base;
}

export function p0RootWorld(requested) {
  const t = requested.body.pose_targets.root.translation;
  const yaw = requested.body.pose_targets.root.yaw;
  const s = modelScale(requested);
  return {
    translation: t.slice(),
    rotation: quat.fromAxisAngle([0, 0, 1], yaw),
    scale: [s, s, s],
  };
}

export function p0PoseRotations() {
  return {
    elbow_R: quat.fromAxisAngle([1, 0, 0], ((180 - 132.95) * Math.PI) / 180),
  };
}

function setLocalFromWorldRotation(locals, world, name, worldRot, rootWorld) {
  const parent = BONE_PARENT[name];
  const parentR = parent && world[parent] ? world[parent].rotation : rootWorld.rotation;
  locals[name].rotation = quat.normalize(quat.multiply(quat.invert(parentR), worldRot));
}

export function aimBone(locals, world, boneName, childName, target, rootWorld) {
  const bone = world[boneName];
  const child = world[childName];
  if (!bone || !child) return;
  const cur = normalize(sub(child.translation, bone.translation));
  const des = normalize(sub(target, bone.translation));
  if (cur[0] === 0 && cur[1] === 0 && cur[2] === 0) return;
  if (des[0] === 0 && des[1] === 0 && des[2] === 0) return;
  const newWorldR = quat.multiply(quat.fromTo(cur, des), bone.rotation);
  setLocalFromWorldRotation(locals, world, boneName, newWorldR, rootWorld);
}

export function solveArmIk(fkWorld, locals, chain, target, branch, pole) {
  const [sh, el, wr] = chain;
  const S = fkWorld[SEMANTIC[sh]].translation;
  const E0 = fkWorld[SEMANTIC[el]].translation;
  const W0 = fkWorld[SEMANTIC[wr]].translation;
  const L1 = distance(S, E0);
  const L2 = distance(E0, W0);
  const n = pole || [0, 0, 1];
  return twoLinkIk(S, target, L1, L2, n, branch);
}

export function applyArmIk(locals, world, rootWorld, chain, target, branch, pole) {
  const ik = solveArmIk(world, locals, chain, target, branch, pole);
  const [sh, el, wr] = chain;
  aimBone(locals, world, SEMANTIC[sh], SEMANTIC[el], ik.elbow, rootWorld);
  const mid = forwardKinematics(locals, rootWorld);
  aimBone(locals, mid.world, SEMANTIC[el], SEMANTIC[wr], ik.wrist, rootWorld);
  const posed = forwardKinematics(locals, rootWorld);
  const wrist = posed.fk[wr];
  return {
    ...ik,
    locals,
    world: posed.world,
    fk: posed.fk,
    residual: wrist ? distance(wrist, target) : ik.residual,
  };
}

export function aimWrist(locals, world, rootWorld, phoneWorld) {
  const boneName = SEMANTIC.wrist_R;
  const bone = world[boneName];
  if (!bone || !phoneWorld) return false;
  const des = normalize(quat.rotateVec(phoneWorld.rotation, [0, 0, -1]));
  if (des[0] === 0 && des[1] === 0 && des[2] === 0) return false;

  const node = nodeByName(boneName);
  const childIdx = node?.children?.[0];
  const childName = childIdx != null ? GLB_NODES.nodes[childIdx]?.name : null;
  const child = childName ? world[childName] : null;
  const cur = child
    ? normalize(sub(child.translation, bone.translation))
    : normalize(quat.rotateVec(bone.rotation, [0, 1, 0]));
  if (cur[0] === 0 && cur[1] === 0 && cur[2] === 0) return false;
  if (dot(cur, des) < -0.95) return false;

  if (childName && child) {
    aimBone(locals, world, boneName, childName, add(bone.translation, des), rootWorld);
  } else {
    const newWorldR = quat.multiply(quat.fromTo(cur, des), bone.rotation);
    setLocalFromWorldRotation(locals, world, boneName, newWorldR, rootWorld);
  }
  return true;
}

export const JOINT_LIMITS = {
  elbow_R: { rad: 2.4, status: "REVIEWED" },
  elbow_L: { rad: 2.4, status: "REVIEWED" },
  knee_L: { rad: 2.4, status: "REVIEWED" },
  knee_R: { rad: 2.4, status: "REVIEWED" },
};

export function projectJointQuat(q, joint) {
  if (!q || q.length !== 4) return q;
  const spec = JOINT_LIMITS[joint];
  if (!spec) return quat.normalize(q);
  const limit = spec.rad;
  const nq = quat.normalize(q);
  const w = Math.max(-1, Math.min(1, nq[3]));
  const ang = 2 * Math.acos(w);
  if (!(ang > limit)) return nq;
  const axisLen = Math.hypot(nq[0], nq[1], nq[2]);
  if (axisLen < 1e-9) return quat.identity();
  return quat.fromAxisAngle([nq[0] / axisLen, nq[1] / axisLen, nq[2] / axisLen], limit);
}

export function anatomicalQuat(bend = 0, tilt = 0, twist = 0) {
  return quat.bendTiltTwist(bend, tilt, twist);
}

export function attachSurfaceReferences(fk, requested) {
  const ratio = requested.body?.definition?.model_adapter?.face_head_extension_ratio ?? 0.645;
  if (fk.head && fk.neck) {
    fk.face_reference = [
      fk.head[0] + ratio * (fk.head[0] - fk.neck[0]),
      fk.head[1] + ratio * (fk.head[1] - fk.neck[1]),
      fk.head[2] + ratio * (fk.head[2] - fk.neck[2]),
    ];
  }
  return fk;
}

export function evaluateSkeleton(requested) {
  const raw = {
    ...p0PoseRotations(),
    ...requested.body.pose_targets.bend_tilt_twist,
  };
  const limited = {};
  const unknown = [];
  for (const [k, q] of Object.entries(raw)) {
    limited[k] = projectJointQuat(q, k);
    if (!JOINT_LIMITS[k]) unknown.push(k);
  }
  const locals = applyPoseRotations(restLocals(), limited);
  const root_world = p0RootWorld(requested);
  const posed = forwardKinematics(locals, root_world);
  const fk = attachSurfaceReferences(posed.fk, requested);
  const adapter = requested.body.definition.model_adapter || {};
  return {
    locals,
    world: posed.world,
    fk,
    root_world,
    glb: requested.body.definition.glb,
    map: MAP,
    joint_limits_applied: true,
    joint_limits_unknown: unknown,
    measured_stature_m: measuredStature(fk),
    labelled_stature_m: requested.body.definition.stature,
    model_stature_m: (adapter.base_height_m || 0) * (root_world.scale?.[0] || 1),
  };
}

export { nodeByName };