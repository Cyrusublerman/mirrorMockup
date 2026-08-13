export function createReferenceLayer() {
  let img = null;
  let opacity = 0.35;
  return {
    get opacity() { return opacity; },
    setOpacity(v) { opacity = Math.max(0, Math.min(1, v)); },
    loadFile(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const im = new Image();
        im.onload = () => {
          img = im;
          resolve();
        };
        im.onerror = () => reject(new Error("reference image failed"));
        im.src = url;
      });
    },
    clear() { img = null; },
    hasImage() { return !!img; },
    draw(ctx, w, h) {
      if (!img) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    },
  };
}
