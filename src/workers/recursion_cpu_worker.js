import { evaluateRecursion } from "../domains/recursion/kernel.js";

self.onmessage = (e) => {
  const { requested, carrier_p, id } = e.data;
  self.postMessage({ id, recursion: evaluateRecursion(requested, carrier_p) });
};
