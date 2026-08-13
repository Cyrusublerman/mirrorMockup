export function diagnosticsText(effective, requested) {
  const c = effective.recursion.certificate;
  const arm = (effective.constraints || []).find((x) => x.constraint_id === "arm_R_reach");
  const glb = (requested.body.definition.glb || "").split("/").pop();
  return [
    `tx ${effective.transaction}`,
    `P ${effective.carrier_p.valid ? "valid" : (effective.carrier_p.reasons || []).join("|") || "invalid"}`,
    `warp req ${requested.recursion.mode} eff ${effective.recursion.mode}`,
    `dM ${Number(effective.apparatus.d_M).toFixed(3)} m`,
    `view ${effective.view.segment} τ=${Number(requested.view.tau).toFixed(3)}`,
    c ? `γ |${c.gamma_abs.toFixed(4)}| arg ${((c.gamma_arg * 180) / Math.PI).toFixed(2)}°` : "γ —",
    `body ${glb}`,
    `phone ${effective.phone.mesh?.kind || "—"} ${effective.phone.mesh?.positions?.length ?? 0}v`,
    `mirror ${effective.mirror.mesh?.kind || "—"} ${effective.mirror.mesh?.positions?.length ?? 0}v`,
    arm ? `arm_R_reach ${Number(arm.residual).toFixed(4)} ${arm.state}` : "arm_R_reach —",
  ].join("\n");
}
