export class InsetInput {
  constructor() {
    this.pts = new Map();
    this.start = null;
    this.pinch = false;
    this.downAt = null;
  }

  bind(inset, opts) {
    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    inset.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      this.pts.set(ev.pointerId, ev);
      this.downAt = { x: ev.clientX, y: ev.clientY, t: performance.now() };
      if (this.pts.size === 2 && opts.cameraEdit()) {
        const [p, q] = [...this.pts.values()];
        this.start = { d: dist(p, q), hfov: opts.getHfov() };
        this.pinch = true;
        opts.onPinchStart?.();
      }
    });
    inset.addEventListener("pointermove", (ev) => {
      if (!this.pts.has(ev.pointerId)) return;
      this.pts.set(ev.pointerId, ev);
      if (this.pts.size === 2 && this.start && opts.cameraEdit()) {
        ev.preventDefault();
        const [p, q] = [...this.pts.values()];
        const s = dist(p, q) / this.start.d;
        opts.setHfov(Math.min(2.2, Math.max(0.35, this.start.hfov / s)));
      }
    });
    const up = (ev) => {
      this.pts.delete(ev.pointerId);
      if (this.pts.size < 2) this.start = null;
      const moved = this.downAt ? Math.hypot(ev.clientX - this.downAt.x, ev.clientY - this.downAt.y) : 0;
      const tap = this.downAt && !this.pinch && moved < 12;
      opts.onHit?.(ev);
      opts.onUp?.(ev);
      if (tap && this.pts.size === 0) opts.onSwap();
      if (this.pts.size === 0) {
        this.pinch = false;
        this.downAt = null;
      }
    };
    inset.addEventListener("pointerup", up);
    inset.addEventListener("pointercancel", up);
  }
}

export function bindInsetSwap(main, inset, onSwap) {
  new InsetInput().bind(inset, {
    cameraEdit: () => false,
    getHfov: () => 1,
    setHfov() {},
    onSwap,
    onUp() {},
  });
}

export function insetPinchHfov() {}
