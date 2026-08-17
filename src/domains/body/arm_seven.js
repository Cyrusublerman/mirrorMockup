import { distance, dot, length, normalize, sub } from "../../shared_math/vector.js";

export class ArmSeven {
  read(fk, side = "R") {
    const sh = fk?.[`shoulder_${side}`];
    const el = fk?.[`elbow_${side}`];
    const wr = fk?.[`wrist_${side}`];
    const hd = fk?.head;
    if (!sh || !wr || !hd) return null;
    const hand = sub(wr, hd);
    const r = length(hand);
    const n = r > 1e-9 ? normalize(hand) : [0, 0, 1];
    const theta = Math.acos(Math.min(1, Math.max(-1, n[2])));
    const phi = Math.atan2(n[0], n[1]);
    let swivel = 0;
    if (el) {
      const a = sub(el, sh);
      const b = sub(wr, sh);
      const plane = [0, 0, 1];
      const crossZ = a[0] * b[1] - a[1] * b[0];
      swivel = Math.atan2(crossZ, dot(normalize(a), plane));
    }
    return { r, theta, phi, swivel, wrist: { bend: 0, tilt: 0, twist: 0 } };
  }
}
