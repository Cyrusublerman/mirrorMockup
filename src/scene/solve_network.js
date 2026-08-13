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
import { evaluateVisibility, projectWorld } from "../domains/visibility/report.js";
import { evaluateCarrierP } from "../domains/carrier_p/project.js";
import { evaluateQ } from "../domains/content_q/content.js";
import { evaluateRecursion } from "../domains/recursion/kernel.js";
import { evaluateMetrics, p0Targets } from "../domains/composition/targets.js";
import { viewCameraAtTau, fillFraction } from "../render/artwork_camera.js";
import { nudgeToPhoneTarget } from "./solve_policy.js";
import { jacobian } from "../shared_math/jacobian.js";
import { fitAperture } from "../domains/mirror/mesh.js";
import { createProposal } from "./proposals.js";

function applyApparatusPan(req) {
  const pan = req.apparatus.apparatus_pan_request_m || [0, 0];
  req.phone.transform_request.translation[0] += pan[0];
  req.phone.transform_request.translation[2] += pan[1];
}

function solveOnce(req) {
  applyApparatusPan(req);
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
  const grip = evaluateGrip(phone, req);
  const pose = evaluatePose(req, phone.grip_world, grip);
  const support = evaluateSupport(pose.fk, req);
  const visibility = evaluateVisibility(pose.fk, cam, mirror);
  const carrier_p = evaluateCarrierP(phone, cam, mirror);
  const content_q = evaluateQ(req, carrier_p);
  const recursion = evaluateRecursion(req, carrier_p);
  const mirrorImageQuad = (mirror.quad || []).map((X) => projectWorld(X, cam).image_norm);
  const composition = evaluateMetrics(visibility, carrier_p, req, mirrorImageQuad);
  const view = viewCameraAtTau(cam, apparatus, carrier_p, recursion, req.view.tau);
  return {
    phone,
    cam,
    apparatus,
    mirror,
    reflection,
    grip,
    pose,
    support,
    visibility,
    carrier_p,
    content_q,
    recursion,
    composition,
    view,
    mirrorImageQuad,
  };
}

function phoneCentroid(req) {
  const phone = evaluatePhone(req);
  const cam = evaluateCamera(phone.world, req);
  const apparatus = evaluateApparatus(cam, req);
  const mirror = evaluateMirror(apparatus, req);
  const p = evaluateCarrierP(phone, cam, mirror);
  const q = p.quad;
  if (!q || q.some((c) => !c)) return [0.5, 0.5];
  return [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
}

function sensitivityAt(req) {
  const x0 = [
    req.apparatus.mirror_distance_request_m,
    req.apparatus.mirror_pan_uv_request_m[0],
  ];
  const J = jacobian(
    (x) => {
      const r = cloneState(req);
      r.apparatus.mirror_distance_auto_solve = false;
      r.apparatus.mirror_distance_request_m = x[0];
      r.apparatus.mirror_pan_uv_request_m[0] = x[1];
      return phoneCentroid(r);
    },
    x0,
    2,
    1e-3,
  );
  return [
    { of: "phone_cx", wrt: "d_M", value: J[0][0] },
    { of: "phone_cy", wrt: "d_M", value: J[1][0] },
    { of: "phone_cx", wrt: "mirror_pan_u", value: J[0][1] },
    { of: "phone_cy", wrt: "mirror_pan_u", value: J[1][1] },
  ];
}

export function solve(requested) {
  const req = cloneState(requested);
  if (!req.composition.targets.length) req.composition.targets = p0Targets();

  let parts = solveOnce(cloneState(req));
  if (req.composition.solve_mode === "COMPOSITION_FIT") {
    for (let i = 0; i < 4; i++) {
      nudgeToPhoneTarget(req, parts.composition.residuals);
      parts = solveOnce(cloneState(req));
    }
  }

  const {
    phone,
    cam,
    apparatus,
    mirror,
    reflection,
    grip,
    pose,
    support,
    visibility,
    carrier_p,
    content_q,
    recursion,
    composition,
    view,
  } = parts;

  let proposal = req.workspace.proposal || null;
  if (req.workspace.pending_mirror_fit) {
    const uvs = [];
    for (const r of Object.values(visibility.reports || {})) {
      if (r.reflected?.aperture?.uv) uvs.push(r.reflected.aperture.uv);
    }
    const fit = uvs.length ? fitAperture(uvs, req.mirror.fit_margin_m) : { width: req.mirror.width_m, height: req.mirror.height_m };
    proposal = createProposal({
      id: "mirror_fit",
      kind: "MIRROR_FIT",
      description: "fit aperture to reflected content",
      patch: { mirror: { width_m: fit.width, height_m: fit.height } },
    });
  }

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

  let sensitivity = [];
  try {
    sensitivity = sensitivityAt(req);
  } catch {
    sensitivity = [];
  }

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
    sensitivity,
    proposal,
  };

  return { requested: req, effective, transaction: top };
}
