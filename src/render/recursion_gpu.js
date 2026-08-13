import { sampleSource, W } from "../domains/recursion/kernel.js";

export function gpuSampleUv(z, certificate) {
  if (!certificate) return null;
  const w = W(z, certificate.pole, certificate.alpha, certificate.beta || [0, 0]);
  return sampleSource(w, certificate.lattice);
}

export const gpuParityStub = gpuSampleUv;
