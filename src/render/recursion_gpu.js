import { sampleSource, W, sampleI } from "../domains/recursion/kernel.js";

export function gpuSampleUv(z, certificate) {
  if (!certificate) return null;
  const w = W(z, certificate.pole, certificate.alpha, certificate.beta || [0, 0]);
  return sampleSource(w, certificate.lattice);
}

export function gpuSampleI(z, certificate, qState) {
  return sampleI(z, certificate, qState);
}

export const gpuParityStub = gpuSampleUv;

export function shaderUsesKernel() {
  return "domains/recursion/kernel.js";
}
