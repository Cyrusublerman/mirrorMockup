const IDLE = "IDLE";
const SELECTED = "SELECTED";
const DRAGGING = "DRAGGING";
const EDITOR_ORBIT = "EDITOR_ORBIT";
const PRECISION = "PRECISION";

export function createInteractionMachine() {
  let mode = IDLE;
  let pointerId = null;
  let start = null;
  let last = null;
  let gesture = null;

  return {
    get mode() { return mode; },
    get gesture() { return gesture; },
    beginSelect(id, pt) {
      pointerId = id;
      start = last = pt;
      mode = SELECTED;
      gesture = null;
    },
    beginDrag(kind, id, pt) {
      pointerId = id;
      start = last = pt;
      mode = DRAGGING;
      gesture = kind;
    },
    beginOrbit(id, pt) {
      pointerId = id;
      start = last = pt;
      mode = EDITOR_ORBIT;
      gesture = "orbit";
    },
    move(id, pt) {
      if (id !== pointerId) return null;
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      last = pt;
      return { dx, dy, start, last, mode, gesture };
    },
    end(id) {
      if (id !== pointerId) return false;
      const was = mode;
      pointerId = null;
      mode = was === DRAGGING || was === EDITOR_ORBIT ? SELECTED : IDLE;
      gesture = null;
      return was;
    },
    openPrecision() { mode = PRECISION; },
    closePrecision() { mode = SELECTED; },
    clear() {
      mode = IDLE;
      pointerId = null;
      start = last = gesture = null;
    },
  };
}
