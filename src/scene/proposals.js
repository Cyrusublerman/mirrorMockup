export function createProposal({ id, kind, description, patch }) {
  return { id, kind, description, patch, status: "OPEN" };
}

export function applyPatch(state, patch) {
  if (!patch) return state;
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(state[k], v);
    else state[k] = v;
  }
  return state;
}

export function acceptProposal(requested, proposal) {
  const next = structuredClone(requested);
  applyPatch(next, proposal.patch);
  proposal.status = "ACCEPTED";
  next.workspace.proposal = proposal;
  return next;
}

export function rejectProposal(proposal) {
  proposal.status = "REJECTED";
  return proposal;
}
