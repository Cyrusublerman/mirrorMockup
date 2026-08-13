export function createDispatchAdapter(app) {
  let gestureOpen = false;
  return {
    startGesture(label) {
      if (gestureOpen) return;
      app.beginUndoGroup(label);
      gestureOpen = true;
    },
    endGesture() {
      gestureOpen = false;
    },
    preview(name, payload) {
      app.dispatch(name, payload, { preview: true });
    },
    commit(name, payload, label) {
      gestureOpen = false;
      app.dispatch(name, payload, { label });
    },
    lastLabel() {
      return app.lastHistoryLabel();
    },
  };
}
