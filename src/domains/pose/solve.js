import { applyArmIk, aimWrist, evaluateSkeleton, forwardKinematics, SEMANTIC } from "../body/skeleton.js";
import { evaluateGrip } from "../hand_grip/grip.js";
import { distance } from "../../shared_math/vector.js";

function ikArm(skel, chain, target, branch, id) {
  const applied = applyArmIk(skel.locals, skel.world, skel.root_world, chain, target, branch);
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
    },
  };
}

export function evaluatePose(requested, phoneGripWorld, gripEval) {
  let skel = evaluateSkeleton(requested);
  const constraints = [];
  const ends = requested.body.pose_targets.endpoint_targets || {};
  const grip =
    gripEval ||
    (phoneGripWorld
      ? evaluateGrip({ grip_world: phoneGripWorld, world: phoneGripWorld }, requested)
      : null);

  if (requested.phone.authority === "PHONE_DRIVES_HAND" && phoneGripWorld) {
    const target = ends.wrist_R || grip.wrist_target || phoneGripWorld.translation;
    const right = ikArm(
      skel,
      ["shoulder_R", "elbow_R", "wrist_R"],
      target,
      requested.body.ik_branches.arm_R,
      "arm_R_reach",
    );
    skel = right.skel;
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
    );
    skel = left.skel;
    constraints.push(left.constraint);
  }

  return { ...skel, constraints };
}
