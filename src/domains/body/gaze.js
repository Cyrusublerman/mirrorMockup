import { aimBone, forwardKinematics, SEMANTIC } from "./skeleton.js";

export class GazeConstraint {
  apply(skel, target) {
    if (!skel?.locals || !skel?.world || !target) return skel;
    if (SEMANTIC.neck && SEMANTIC.head) {
      aimBone(skel.locals, skel.world, SEMANTIC.neck, SEMANTIC.head, target, skel.root_world);
    }
    const posed = forwardKinematics(skel.locals, skel.root_world);
    return { ...skel, world: posed.world, fk: posed.fk };
  }
}
