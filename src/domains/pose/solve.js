import { applyArmIk, evaluateSkeleton } from "../body/skeleton.js";

export function evaluatePose(requested, phoneGripWorld) {
  let skel = evaluateSkeleton(requested);
  const constraints = [];
  const ends = requested.body.pose_targets.endpoint_targets || {};
  if (requested.phone.authority === "PHONE_DRIVES_HAND" && phoneGripWorld) {
    const target = ends.wrist_R || phoneGripWorld.translation;
    const applied = applyArmIk(
      skel.locals,
      skel.world,
      skel.root_world,
      ["shoulder_R", "elbow_R", "wrist_R"],
      target,
      requested.body.ik_branches.arm_R,
    );
    skel = {
      ...skel,
      locals: applied.locals,
      world: applied.world,
      fk: applied.fk,
    };
    skel.fk.wrist_R_effective = applied.wrist;
    skel.fk.elbow_R_effective = applied.elbow;
    constraints.push({
      id: "arm_R_reach",
      state: applied.projected || applied.residual > 0.02 ? "PROJECTED" : "PASS",
      residual: applied.residual,
      branch: applied.branch,
    });
  }
  return { ...skel, constraints };
}
