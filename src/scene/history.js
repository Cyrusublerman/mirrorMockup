export function createHistory(limit = 100) {
  return { past: [], future: [], limit };
}

export function pushHistory(hist, requested) {
  hist.past.push(structuredClone(requested));
  if (hist.past.length > hist.limit) hist.past.shift();
  hist.future = [];
}

export function undo(hist, current) {
  if (!hist.past.length) return current;
  hist.future.push(structuredClone(current));
  return hist.past.pop();
}

export function redo(hist, current) {
  if (!hist.future.length) return current;
  hist.past.push(structuredClone(current));
  return hist.future.pop();
}
