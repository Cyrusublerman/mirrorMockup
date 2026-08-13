export function labelForHit(hit) {
  if (!hit) return "Nothing selected";
  if (hit.kind === "joint") return `Joint ${hit.id}`;
  if (hit.kind === "phone") return "Phone";
  if (hit.kind === "mirror") return "Mirror";
  if (hit.kind === "body") return "Body";
  return hit.kind;
}
