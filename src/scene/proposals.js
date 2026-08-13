export function createProposal({ id, kind, description, patch }) {
  return { id, kind, description, patch, status: "OPEN" };
}

export function acceptProposal(requested, proposal) {
  const next = structuredClone(requested);
  Object.assign(next, proposal.patch);
  proposal.status = "ACCEPTED";
  return next;
}

export function rejectProposal(proposal) {
  proposal.status = "REJECTED";
  return proposal;
}
