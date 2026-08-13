import { defaultRequestedState } from "../scene/requested_state.js";
import { solve } from "../scene/solve_network.js";
import { applyAction } from "./actions.js";
import { createHistory, pushHistory, undo as histUndo, redo as histRedo, lastLabel } from "../scene/history.js";
import * as selectors from "./selectors.js";
import { packProject, unpackProject } from "./project_io.js";
import { exportImage } from "../domains/export/image.js";
import { BUILD } from "./build_identity.js";

function cloneMerge(base, patch) {
  const next = structuredClone(base);
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && next[k] && typeof next[k] === "object") Object.assign(next[k], v);
    else next[k] = v;
  }
  return next;
}

const NO_HISTORY = new Set([
  "UNDO", "REDO",
  "EXPORT_IMAGE", "EXPORT_FINAL_CAMERA", "EXPORT_STAGING_PRESCRIPTION",
  "EXPORT_COMPOSITION_OVERLAY", "EXPORT_REFERENCE_RENDER",
  "SAVE_SNAPSHOT",
]);

export function createApp() {
  let requested = defaultRequestedState();
  let last = solve(requested);
  requested = last.requested;
  const history = createHistory();
  const snapshots = {};

  function dispatch(name, payload = {}, opts = {}) {
    if (name === "UNDO") {
      requested = histUndo(history, requested);
      last = solve(requested);
      requested = last.requested;
      return last;
    }
    if (name === "REDO") {
      requested = histRedo(history, requested);
      last = solve(requested);
      requested = last.requested;
      return last;
    }
    if (name === "SAVE_SNAPSHOT") {
      snapshots[payload.id] = { kind: payload.kind || "SCENE", state: structuredClone(requested) };
      if (payload.kind === "POSE") {
        snapshots[payload.id].state = { body: structuredClone(requested.body) };
      }
      if (payload.kind === "WORKSPACE") {
        snapshots[payload.id].state = {
          workspace: structuredClone(requested.workspace),
          view: structuredClone(requested.view),
          reference: { registration: structuredClone(requested.reference.registration) },
        };
      }
      return last;
    }
    if (name === "LOAD_SNAPSHOT") {
      if (!snapshots[payload.id]) return { ...last, error: "no snapshot" };
      pushHistory(history, requested, payload.label || "Load snapshot");
      const snap = snapshots[payload.id];
      if (snap.kind === "POSE") {
        requested = cloneMerge(requested, { body: snap.state.body });
      } else if (snap.kind === "WORKSPACE") {
        requested = cloneMerge(requested, snap.state);
      } else {
        requested = structuredClone(snap.state);
      }
      last = solve(requested);
      requested = last.requested;
      return last;
    }
    if (name === "EXPORT_IMAGE" || name === "EXPORT_FINAL_CAMERA" || name === "EXPORT_STAGING_PRESCRIPTION" || name === "EXPORT_COMPOSITION_OVERLAY" || name === "EXPORT_REFERENCE_RENDER") {
      last.export = exportImage(requested, last.effective, { ...payload, product: name });
      last.export.sidecar = { ...last.export.sidecar, build: BUILD, solver: last.effective.solver };
      return last;
    }
    if (!opts.preview && !NO_HISTORY.has(name)) {
      pushHistory(history, requested, opts.label || name);
    }
    const result = applyAction(requested, name, payload);
    if (result.error) return { ...last, error: result.error };
    requested = result.requested;
    last = solve(requested);
    requested = last.requested;
    if (requested.workspace.pending_mirror_fit && last.effective.proposal) {
      requested.workspace.proposal = last.effective.proposal;
      requested.workspace.pending_mirror_fit = false;
    }
    return last;
  }

  return {
    dispatch,
    beginUndoGroup: (label = "") => {
      pushHistory(history, requested, label);
    },
    getRequested: () => requested,
    getEffective: () => last.effective,
    getLast: () => last,
    selectors,
    lastHistoryLabel: () => lastLabel(history),
    build: BUILD,
    pack: () => packProject(requested, last.effective),
    load: (data) => {
      requested = unpackProject(data);
      last = solve(requested);
      requested = last.requested;
      return last;
    },
  };
}
