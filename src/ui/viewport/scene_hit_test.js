export function hitFromEvent(scene3d, ev) {
  return scene3d.hitTest(ev.clientX, ev.clientY);
}
