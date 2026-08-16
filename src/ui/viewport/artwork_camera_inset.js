export function bindInsetSwap(main, inset, onSwap) {
  inset.addEventListener("pointerdown", (ev) => {
    ev.stopPropagation();
    onSwap();
  });
}

export function insetPinchHfov(inset, getHfov, onChange, onEnd) {
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const pts = new Map();
  let start = null;
  let active = false;
  inset.addEventListener("pointerdown", (ev) => {
    pts.set(ev.pointerId, ev);
    if (pts.size === 2) {
      const [p, q] = [...pts.values()];
      start = { d: dist(p, q), hfov: getHfov() };
      active = true;
    }
  });
  inset.addEventListener("pointermove", (ev) => {
    if (!pts.has(ev.pointerId)) return;
    pts.set(ev.pointerId, ev);
    if (pts.size !== 2 || !start) return;
    ev.preventDefault();
    const [p, q] = [...pts.values()];
    const s = dist(p, q) / start.d;
    onChange(Math.min(2.2, Math.max(0.35, start.hfov / s)));
  });
  const up = (ev) => {
    pts.delete(ev.pointerId);
    if (pts.size < 2 && active) {
      onEnd?.(getHfov());
      active = false;
      start = null;
    }
    if (pts.size < 2) start = null;
  };
  inset.addEventListener("pointerup", up);
  inset.addEventListener("pointercancel", up);
}
