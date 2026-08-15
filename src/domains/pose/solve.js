import { applyArmIk, aimBone, aimWrist, evaluateSkeleton, forwardKinematics, SEMANTIC, BONE_PARENT } from "../body/skeleton.js";
import { evaluateGrip } from "../hand_grip/grip.js";
import { evaluateSupport } from "../support/contact.js";
import { add, distance, scale, sub } from "../../shared_math/vector.js";

function poleOf(requested, id) {
  const ang = requested.body?.pose_targets?.swivel?.[id] || 0;
  return [Math.sin(ang), 0, Math.cos(ang)];
}

function ikArm(skel, chain, target, branch, id, pole) {
  const applied = applyArmIk(skel.locals, skel.world, skel.root_world, chain, target, branch, pole);
  const next = {
    ...skel,
    locals: applied.locals,
    world: applied.world,
    fk: { ...applied.fk },
  };
  const wr = chain[2];
  next.fk[`${wr}_effective`] = applied.wrist;
  next.fk[`${chain[1]}_effective`] = applied.elbow;
  return {
    skel: next,
    constraint: {
      id,
      state: applied.projected || applied.residual > 0.02 ? "PROJECTED" : "PASS",
      residual: applied.residual,
      branch: applied.branch,
      projected: !!applied.projected,
    },
    lengths: {
      L1: distance(applied.fk[chain[0]] || applied.fk.shoulder_R, applied.fk[chain[1]] || applied.fk.elbow_R),
      L2: distance(applied.fk[chain[1]] || applied.fk.elbow_R, applied.fk[chain[2]] || applied.fk.wrist_R),
    },
  };
}

function plantRoot(requested, skel) {
  const support = evaluateSupport(skel.fk, requested);
  if (Math.abs(support.plant_delta_z) <= 1e-4) {
    return { skel, planted: support, shifted: false };
  }
  requested.body.pose_targets.root.translation[2] += support.plant_delta_z;
  const next = evaluateSkeleton(requested);
  return { skel: next, planted: evaluateSupport(next.fk, requested), shifted: true };
}

function coupleTowardTarget(requested, skel, target) {
  const wrist = skel.fk.wrist_R;
  if (!wrist || !target) return { skel, coupled: null };
  const delta = sub(target, wrist);
  const mag = Math.hypot(delta[0], delta[1], delta[2]);
  if (mag < 0.03) return { skel, coupled: null };
  const step = scale(delta, 0.55);
  requested.body.pose_targets.root.translation = add(requested.body.pose_targets.root.translation, [step[0], step[1], 0]);
  let next = evaluateSkeleton(requested);
  const clavName = BONE_PARENT[SEMANTIC.shoulder_R];
  if (clavName && next.world[clavName]) {
    aimBone(next.locals, next.world, clavName, SEMANTIC.shoulder_R, target, next.root_world);
    const posed = forwardKinematics(next.locals, next.root_world);
    next = { ...next, world: posed.world, fk: posed.fk };
  }
  return {
    skel: next,
    coupled: { moved: ["root", "clavicle"], delta: step, residual_before: mag },
  };
}

export function evaluatePose(requested, phoneGripWorld, gripEval) {
  let skel = evaluateSkeleton(requested);
  const planted = plantRoot(requested, skel);
  skel = planted.skel;
  const constraints = [];
  const ends = requested.body.pose_targets.endpoint_targets || {};
  const grip =
    gripEval ||
    (phoneGripWorld
      ? evaluateGrip({ grip_world: phoneGripWorld, world: phoneGripWorld }, requested)
      : null);

  let coupled = null;
  const authority = requested.phone.authority;

  if (authority === "HAND_DRIVES_PHONE") {
    const target = ends.wrist_R;
    if (target) {
      const right = ikArm(
        skel,
        ["shoulder_R", "elbow_R", "wrist_R"],
        target,
        requested.body.ik_branches.arm_R,
        "arm_R_reach",
        poleOf(requested, "arm_R"),
      );
      skel = right.skel;
      if (right.constraint.residual > 0.03) {
        const c = coupleTowardTarget(requested, skel, target);
        skel = c.skel;
        coupled = c.coupled;
        const again = ikArm(
          skel,
          ["shoulder_R", "elbow_R", "wrist_R"],
          target,
          requested.body.ik_branches.arm_R,
          "arm_R_reach",
        );
        skel = again.skel;
        again.constraint.id = "arm_R_reach";
        constraints.push(again.constraint);
      } else {
        constraints.push(right.constraint);
      }
    }
  } else if ((authority === "PHONE_DRIVES_HAND" || authority === "LOCK_GRIP") && phoneGripWorld) {
    const target = ends.wrist_R || grip.wrist_target || phoneGripWorld.translation;
    let right = ikArm(
      skel,
      ["shoulder_R", "elbow_R", "wrist_R"],
      target,
      requested.body.ik_branches.arm_R,
      "arm_R_reach",
      poleOf(requested, "arm_R"),
    );
    skel = right.skel;
    if (right.constraint.residual > 0.03) {
      const c = coupleTowardTarget(requested, skel, target);
      skel = c.skel;
      coupled = c.coupled;
      right = ikArm(
        skel,
        ["shoulder_R", "elbow_R", "wrist_R"],
        target,
        requested.body.ik_branches.arm_R,
        "arm_R_reach",
        poleOf(requested, "arm_R"),
      );
      skel = right.skel;
    }
    const wristBone = SEMANTIC.wrist_R;
    const savedWrist = skel.locals[wristBone]?.rotation.slice();
    if (aimWrist(skel.locals, skel.world, skel.root_world, phoneGripWorld)) {
      const posed = forwardKinematics(skel.locals, skel.root_world);
      const residual = posed.fk.wrist_R ? distance(posed.fk.wrist_R, target) : right.constraint.residual;
      if (residual <= 0.03) {
        skel = {
          ...skel,
          world: posed.world,
          fk: {
            ...posed.fk,
            wrist_R_effective: posed.fk.wrist_R,
            elbow_R_effective: posed.fk.elbow_R,
          },
        };
        right.constraint.residual = residual;
        if (residual > 0.02) right.constraint.state = "PROJECTED";
      } else if (savedWrist && skel.locals[wristBone]) {
        skel.locals[wristBone].rotation = savedWrist;
      }
    }
    constraints.push(right.constraint);
  }

  if (ends.wrist_L) {
    const left = ikArm(
      skel,
      ["shoulder_L", "elbow_L", "wrist_L"],
      ends.wrist_L,
      requested.body.ik_branches.arm_L,
      "arm_L_reach",
      poleOf(requested, "arm_L"),
    );
    skel = left.skel;
    constraints.push(left.constraint);
  }

  const rest = evaluateSkeleton({
    ...requested,
    body: {
      ...requested.body,
      pose_targets: { ...requested.body.pose_targets, bend_tilt_twist: {}, endpoint_targets: {} },
    },
  });
  const link = {
    arm_R: {
      L1_rest: distance(rest.fk.shoulder_R, rest.fk.elbow_R),
      L2_rest: distance(rest.fk.elbow_R, rest.fk.wrist_R),
      L1: distance(skel.fk.shoulder_R, skel.fk.elbow_R),
      L2: distance(skel.fk.elbow_R, skel.fk.wrist_R),
    },
  };

  return {
    ...skel,
    constraints,
    coupled,
    plant: planted.planted,
    plant_applied: planted.shifted,
    link_lengths: link,
  };
}
