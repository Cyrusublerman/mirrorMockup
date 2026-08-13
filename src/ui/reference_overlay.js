export function drawReference(el, requested) {
  const f = requested.reference.landmarks.features;
  const rows = Object.entries(f)
    .map(([id, v]) => `<tr><td>${id}</td><td>${v.centroid.map((x) => x.toFixed(3)).join(", ")}</td></tr>`)
    .join("");
  el.innerHTML = `<h3>P0 evidence</h3><p>IMAGE_NORM · OBSERVED</p><table>${rows}</table>`;
}
