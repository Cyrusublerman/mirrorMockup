export function diagnosticsText(effective, requested) {
  const c = effective.recursion.certificate;
  return [
    `tx ${effective.transaction}`,
    `P ${effective.carrier_p.valid ? "valid" : (effective.carrier_p.reasons || []).join("|")}`,
    `warp ${effective.recursion.mode}`,
    `dM ${effective.apparatus.d_M.toFixed(3)} m`,
    `view ${effective.view.segment} τ=${requested.view.tau.toFixed(3)}`,
    c ? `γ |${c.gamma_abs.toFixed(4)}| arg ${(c.gamma_arg * 180 / Math.PI).toFixed(2)}°` : "γ —",
  ].join("\n");
}
