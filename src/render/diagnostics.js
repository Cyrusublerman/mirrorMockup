export function diagnosticsText(effective, requested) {
  const c = effective.recursion.certificate;
  const arm = (effective.constraints || []).find((x) => x.constraint_id === "arm_R_reach");
  const glb = (requested.body.definition.glb || "").split("/").pop();
  const comp = effective.compensation;
  const last = effective.last_edit;
  return [
    `tx ${effective.transaction}`,
    `P ${effective.carrier_p.valid ? "valid" : (effective.carrier_p.reasons || []).join("|") || "invalid"}`,
    `warp req ${requested.recursion.mode} eff ${effective.recursion.mode}`,
    `dM ${Number(effective.apparatus.d_M).toFixed(3)} m`,
    `view ${effective.view.segment} τ=${Number(requested.view.tau).toFixed(3)}`,
    c ? `γ |${c.gamma_abs.toFixed(4)}| arg ${((c.gamma_arg * 180) / Math.PI).toFixed(2)}°` : "γ —",
    c ? `no-fold ${c.no_fold} detJ ${Number(c.detJ_probe).toFixed(4)}` : "",
    `body ${glb}`,
    `phone ${effective.phone.mesh?.kind || "—"} ${effective.phone.mesh?.positions?.length ?? 0}v`,
    `mirror ${effective.mirror.mesh?.kind || "—"} ${effective.mirror.mesh?.positions?.length ?? 0}v`,
    arm ? `arm_R_reach ${Number(arm.residual).toFixed(4)} ${arm.state}` : "arm_R_reach —",
    comp ? `compensate ${comp.variable} ${Number(comp.from).toFixed(3)}→${Number(comp.to).toFixed(3)}` : "compensate —",
    last ? `driver ${last.driver} preserve ${last.preserve.join("|")}` : "",
    `cal ${requested.camera.calibration_id || "—"} ${requested.camera.epistemic_status}`,
  ].filter(Boolean).join("\n");
}
