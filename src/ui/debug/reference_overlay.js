export function drawReference(el, requested) {
  const f = requested.reference.landmarks.features;
  const rows = Object.entries(f)
    .map(([id, v]) => `<tr><td>${id}</td><td>${(v.bbox_centre || v.centroid || []).map((x) => Number(x).toFixed(3)).join(", ")}</td></tr>`)
    .join("");
  const reg = requested.reference.registration;
  const regHtml = reg ? `<p>registration opacity ${reg.opacity}</p>` : "";
  el.innerHTML = `<details>
    <summary>P0 evidence · IMAGE_NORM · OBSERVED</summary>
    ${regHtml}
    <table>${rows}</table>
  </details>`;
}
