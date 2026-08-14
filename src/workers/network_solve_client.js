import { solve } from "../scene/solve_network.js";

export class NetworkSolveClient {
  constructor() {
    this.seq = 0;
    this.worker = null;
    if (typeof Worker !== "undefined") {
      try {
        this.worker = new Worker(new URL("./network_solve_worker.js", import.meta.url), { type: "module" });
      } catch {
        this.worker = null;
      }
    }
  }

  run(requested) {
    const result = solve(requested);
    if (this.worker) {
      try {
        this.worker.postMessage({ requested, id: ++this.seq });
      } catch {
        /* structured clone of a live graph can fail; main-thread result stands */
      }
    }
    return result;
  }
}
