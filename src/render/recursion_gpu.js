import { sampleSource } from "../domains/recursion/kernel.js";

export function gpuParityStub(certificate, z) {
  if (!certificate) return null;
  const W = certificate.map ? certificate.map(z) : null;
  return { uv: W ? sampleSource(W, certificate.lattice) : null, cpu_authority: true };
}
