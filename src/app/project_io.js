export function packProject(requested, effective) {
  return {
    version: 1,
    requested,
    effective_summary: {
      transaction: effective.transaction,
      p_valid: effective.carrier_p.valid,
      recursion: effective.recursion.mode,
      tau: effective.view.tau,
    },
  };
}

export function unpackProject(data) {
  return structuredClone(data.requested);
}
