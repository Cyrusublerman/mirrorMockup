import { cloneState } from "./requested_state.js";
import { constraintResult, emptyEffective } from "./effective_state.js";
import { evaluatePhone } from "../domains/phone/prism.js";
import { evaluateCamera } from "../domains/camera/model.js";
import { evaluateApparatus, autosolveDistance } from "../domains/apparatus/relation.js";
import { evaluateMirror } from "../domains/mirror/mesh.js";
import { evaluateReflection } from "../domains/reflection/reflect.js";
import { evaluatePose } from "../domains/pose/solve.js";
import { evaluateSupport } from "../domains/support/contact.js";
import { evaluateGrip } from "../domains/hand_grip/grip.js";
import { evaluateVisibility } from "../domains/visibility/report.js";
import { evaluateCarrierP } from "../domains/carrier_p/project.js";
import { evaluateQ } from "../domains/content_q/content.js";
import { evaluateRecursion } from "../domains/recursion/kernel.js";
import { evaluateMetrics, p0Targets } from "../domains/composition/targets.js";
import { viewCameraAtTau, fillFraction } from "../render/artwork_camera.js";

export function solve(requested) {
  const req = cloneState(requested);
  if (!req.composition.targets.length) req.composition.targets = p0Targets();

  const phone = evaluatePhone(req);
  let cam = evaluateCamera(phone.world, req);
  let apparatus = evaluateApparatus(cam, req);

  if (req.apparatus.mirror_distance_auto_solve) {
    const trialMirror = evaluateMirror(apparatus, req);
    const trialP = evaluateCarrierP(phone, cam, trialMirror);
    const measured = Math.abs(trialP.area || 0);
    const target = req.apparatus.preserved_reflected_phone_ratio;
    const nextD = autosolveDistance(apparatus.d_M, target, Math.max(measured, 1e-8));
    req.apparatus.mirror_distance_request_m = nextD;
    apparatus = evaluateApparatus(cam, req);
  }

  const mirror = evaluateMirror(apparatus, req);
  const reflection = evaluateReflection(cam, mirror);
  const pose = evaluatePose(req, phone.grip_world);
  const support = evaluateSupport(pose.fk, req);
  const grip = evaluateGrip(phone, req);
  const visibility = evaluateVisibility(pose.fk, cam, mirror);
  const carrier_p = evaluateCarrierP(phone, cam, mirror);
  const content_q = evaluateQ(req, carrier_p);
  const recursion = evaluateRecursion(req, carrier_p);
  const composition = evaluateMetrics(visibility, carrier_p, req);
  const view = viewCameraAtTau(cam, apparatus, carrier_p, recursion, req.view.tau);

  const constraints = [
    ...(pose.constraints || []).map((c) =>
      constraintResult({
        state: c.state,
        constraint_id: c.id,
        requested: null,
        effective: null,
        residual: c.residual,
      }),
    ),
    ...support.reports.map((r) =>
      constraintResult({
        state: r.state,
        constraint_id: `support_${r.contact}`,
        requested: support.floor_z,
        effective: r.z,
        residual: r.penetration,
      }),
    ),
    constraintResult({
      state: apparatus.parallel_residual < 1e-6 ? "PASS" : "PROJECTED",
      constraint_id: "apparatus_parallel",
      requested: -1,
      effective: -1 + apparatus.parallel_residual,
      residual: apparatus.parallel_residual,
    }),
    constraintResult({
      state: carrier_p.valid ? "PASS" : "FAIL",
      constraint_id: "carrier_p",
      requested: true,
      effective: carrier_p.valid,
      residual: carrier_p.valid ? 0 : 1,
      reason: (carrier_p.reasons || []).join(","),
    }),
  ];

  const top = constraints.some((c) => c.state === "FAIL")
    ? "FAIL"
    : constraints.some((c) => c.state === "PROJECTED")
      ? "PROJECTED"
      : "PASS";

  const effective = {
    ...emptyEffective(),
    skeleton: pose,
    phone,
    camera: cam,
    apparatus,
    mirror,
    virtual_camera: reflection.virtual_camera,
    visibility,
    composition_metrics: composition.metrics,
    carrier_p,
    content_q,
    recursion,
    view: { ...view, fillFraction: fillFraction(carrier_p) },
    constraints,
    residuals: composition.residuals,
    support,
    grip,
    transaction: top,
  };

  return { requested: req, effective, transaction: top };
}
