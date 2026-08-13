import { solve } from "../scene/solve_network.js";

self.onmessage = (e) => {
  const { requested, id } = e.data;
  const result = solve(requested);
  self.postMessage({ id, transaction: result.transaction, effective: result.effective });
};
