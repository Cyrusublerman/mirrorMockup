import { defaultRequestedState } from "../scene/requested_state.js";
import { solve } from "../scene/solve_network.js";
import { applyAction } from "./actions.js";
import { createHistory, pushHistory, undo as histUndo, redo as histRedo } from "../scene/history.js";
import * as selectors from "./selectors.js";
import { packProject, unpackProject } from "./project_io.js";
import { exportImage } from "../domains/export/image.js";

export function createApp() {
  let requested = defaultRequestedState();
  let last = solve(requested);
  const history = createHistory();
  const snapshots = {};

  function dispatch(name, payload) {
    if (name === "UNDO") {
      requested = histUndo(history, requested);
      last = solve(requested);
      return last;
    }
    if (name === "REDO") {
      requested = histRedo(history, requested);
      last = solve(requested);
      return last;
    }
    if (name === "SAVE_SNAPSHOT") {
      snapshots[payload.id] = structuredClone(requested);
      return last;
    }
    if (name === "LOAD_SNAPSHOT") {
      pushHistory(history, requested);
      requested = structuredClone(snapshots[payload.id]);
      last = solve(requested);
      return last;
    }
    if (name === "EXPORT_IMAGE") {
      last.export = exportImage(requested, last.effective, payload);
      return last;
    }
    pushHistory(history, requested);
    const result = applyAction(requested, name, payload);
    if (result.error) return { ...last, error: result.error };
    requested = result.requested;
    last = solve(requested);
    return last;
  }

  return {
    dispatch,
    getRequested: () => requested,
    getEffective: () => last.effective,
    getLast: () => last,
    selectors,
    pack: () => packProject(requested, last.effective),
    load: (data) => {
      requested = unpackProject(data);
      last = solve(requested);
      return last;
    },
  };
}
