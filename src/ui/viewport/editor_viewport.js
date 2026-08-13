export function createEditorViewport(canvas, scene3d, machine, handlers) {
  const pointers = new Map();
  let pinch0 = null;

  function pt(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top, id: ev.pointerId };
  }

  canvas.addEventListener("pointerdown", (ev) => {
    canvas.setPointerCapture?.(ev.pointerId);
    pointers.set(ev.pointerId, ev);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      machine.beginOrbit(ev.pointerId, pt(ev));
      return;
    }
    handlers.onDown(ev, pt(ev));
  });

  canvas.addEventListener("pointermove", (ev) => {
    if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, ev);
    if (pointers.size === 2 && pinch0) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      handlers.onDolly(pinch0 / d);
      pinch0 = d;
      return;
    }
    handlers.onMove(ev, pt(ev));
  });

  const end = (ev) => {
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinch0 = null;
    handlers.onUp(ev, pt(ev));
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
}
