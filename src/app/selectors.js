export function selectSceneSummary(effective) {
  return {
    transaction: effective.transaction,
    p_valid: effective.carrier_p.valid,
    recursion_mode: effective.recursion.mode,
    recursion_available: effective.recursion.available,
    d_M: effective.apparatus.d_M,
    view_segment: effective.view.segment,
  };
}

export function selectRequestedEffective(requested, effective) {
  return { requested, effective };
}

export function selectConstraintNet(effective) {
  return effective.constraints;
}

export function selectSolveFreedoms(requested) {
  return {
    mode: requested.composition.solve_mode,
    preserve: requested.composition.active_preserve_set,
    freedoms: requested.composition.solve_freedoms,
  };
}

export function selectSensitivity(effective) {
  return effective.sensitivity;
}

export function selectPose(effective) {
  return effective.skeleton;
}

export function selectSupport(effective) {
  return effective.support;
}

export function selectPhone(effective) {
  return effective.phone;
}

export function selectCaptureCamera(effective) {
  return effective.camera;
}

export function selectApparatusRelation(effective) {
  return effective.apparatus;
}

export function selectMirror(effective) {
  return effective.mirror;
}

export function selectReflection(effective) {
  return effective.virtual_camera;
}

export function selectVisibility(effective) {
  return effective.visibility;
}

export function selectCompositionProfile(requested) {
  return requested.reference.active_profile;
}

export function selectCompositionMetrics(effective) {
  return { metrics: effective.composition_metrics, residuals: effective.residuals };
}

export function selectReferenceOverlay(requested) {
  return requested.reference;
}

export function selectCarrierP(effective) {
  return effective.carrier_p;
}

export function selectContentQ(effective) {
  return effective.content_q;
}

export function selectRecursionState(effective) {
  return effective.recursion;
}

export function selectRecursionCertificate(effective) {
  return effective.recursion.certificate;
}

export function selectSamplingDiagnostics(effective) {
  return effective.recursion.certificate;
}

export function selectViewTraversal(effective) {
  return effective.view;
}

export function selectWarpState(requested, effective) {
  return { requested: requested.recursion.mode, effective: effective.recursion.mode, available: effective.recursion.available };
}

export function selectOverlays(requested) {
  return requested.workspace.overlays;
}

export function selectProposal(effective) {
  return effective?.proposal ?? null;
}

export function selectExportSnapshot(effective) {
  return {
    p_valid: effective.carrier_p.valid,
    tau: effective.view.tau,
    mode: effective.recursion.mode,
  };
}
