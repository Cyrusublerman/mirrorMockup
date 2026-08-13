export function mountCertificateBadge(el, proj) {
  el.className = "mp-cert";
  el.replaceChildren();
  const kind = proj.rec?.certificate_kind || (proj.portal?.valid ? "EXACT" : "NON-CLOSING");
  const chip = document.createElement("strong");
  chip.textContent = kind;
  chip.setAttribute("aria-label", "Recursion certificate " + kind);
  el.appendChild(chip);
  const b = proj.build || {};
  const line = document.createElement("span");
  line.textContent = `APP ${b.APP || "?"}  UI ${b.UI || "?"}  CORE ${b.CORE || "?"}`;
  el.appendChild(line);
  const c = document.createElement("span");
  c.className = "mp-muted";
  c.textContent = b.commit || "";
  el.appendChild(c);
}
