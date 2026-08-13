export function evaluateQ(requested, carrierP) {
  return {
    fill_mode: requested.content_q.fill_mode,
    scale: requested.content_q.scale,
    offset: requested.content_q.offset.slice(),
    rotation: requested.content_q.rotation,
    crop: { ...requested.content_q.crop },
    carrier_unchanged: true,
    mapping: carrierP?.homography || null,
  };
}
