export function createHistory(limit = 100) {
  return { past: [], future: [], limit };
}

export function pushHistory(hist, requested, label = "") {
  hist.past.push({ state: structuredClone(requested), label });
  if (hist.past.length > hist.limit) hist.past.shift();
  hist.future = [];
}

export function undo(hist, current) {
  if (!hist.past.length) return current;
  hist.future.push({ state: structuredClone(current), label: "redo" });
  return hist.past.pop().state;
}

export function redo(hist, current) {
  if (!hist.future.length) return current;
  hist.past.push({ state: structuredClone(current), label: "undo" });
  return hist.future.pop().state;
}

export function lastLabel(hist) {
  return hist.past.length ? hist.past[hist.past.length - 1].label : "";
}
