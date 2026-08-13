import { evaluateSkeleton, solveArmIk, SEMANTIC } from "../body/skeleton.js";

export function evaluatePose(requested, phoneGripWorld) {
  const skel = evaluateSkeleton(requested);
  const constraints = [];
  if (requested.phone.authority === "PHONE_DRIVES_HAND" && phoneGripWorld) {
    const ik = solveArmIk(
      skel.world,
      skel.locals,
      ["shoulder_R", "elbow_R", "wrist_R"],
      phoneGripWorld.translation,
      requested.body.ik_branches.arm_R,
    );
    skel.fk.wrist_R_effective = ik.wrist;
    skel.fk.elbow_R_effective = ik.elbow;
    constraints.push({
      id: "arm_R_reach",
      state: ik.projected ? "PROJECTED" : "PASS",
      residual: ik.residual,
      branch: ik.branch,
    });
  }
  return { ...skel, constraints };
}
