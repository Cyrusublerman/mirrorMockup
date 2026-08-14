import { cloneState } from "../../scene/requested_state.js";

export function createDispatchAdapter(app) {
  let gestureOpen = false;
  let baseline = null;
  return {
    startGesture(label) {
      if (gestureOpen) return;
      baseline = cloneState(app.getRequested());
      app.beginUndoGroup(label);
      gestureOpen = true;
    },
    endGesture() {
      if (typeof app.commitPreview === "function") app.commitPreview();
      gestureOpen = false;
      baseline = null;
    },
    revertPreview() {
      if (!baseline) return;
      app.load({ requested: baseline, effective: null });
      baseline = null;
      gestureOpen = false;
    },
    preview(name, payload) {
      app.dispatch(name, payload, { preview: true });
    },
    commit(name, payload, label) {
      gestureOpen = false;
      baseline = null;
      app.dispatch(name, payload, { label });
    },
    lastLabel() {
      return app.lastHistoryLabel();
    },
    get gestureOpen() {
      return gestureOpen;
    },
  };
}
