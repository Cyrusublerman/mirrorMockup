export function mountCertificateBadge(el, proj) {
  el.className = "mp-cert";
  el.replaceChildren();
  const b = proj.build || {};
  const line = document.createElement("span");
  line.textContent = `APP ${b.APP || "?"}  UI ${b.UI || "?"}  CORE ${b.CORE || "?"}`;
  el.appendChild(line);
  const c = document.createElement("span");
  c.className = "mp-muted";
  c.textContent = b.commit || "";
  el.appendChild(c);
}
