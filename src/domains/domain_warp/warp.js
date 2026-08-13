import { jacobian, anisotropy } from "../../shared_math/jacobian.js";

export function identityWarp(z) {
  return z.slice();
}

export function evaluateDomainWarp(requested, layers) {
  const mode = requested.domain_warp?.mode || "IDENTITY";
  const map = mode === "IDENTITY" ? identityWarp : identityWarp;
  const z0 = [0.4, 0.35];
  const J = jacobian((x) => map(x), z0, 2, 1e-5);
  const detJ = J[0][0] * J[1][1] - J[0][1] * J[1][0];
  const K = anisotropy(J);
  return {
    mode,
    map,
    detJ,
    K,
    fold: detJ <= 0,
    loop_topology_preserved: detJ > 0,
    protected: requested.domain_warp?.protect || [],
    layers_attached: !!(layers && layers.L2),
  };
}
