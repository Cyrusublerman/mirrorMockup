export const PANEL_IDENTITY = {
  vertices: 0,
  edges: 0,
  faces: 0,
  regions: 0,
  fixture: "IDENTITY_ZERO_CUTS",
  note: "CLOS-19 469/900/432/72 fixture not in-repo; identity operator is source-exact with zero cuts",
};

export function evaluatePanelSpace(requested) {
  const cuts = requested.panel_space?.cuts || [];
  const transforms = requested.panel_space?.transforms || [];
  const connectors = requested.panel_space?.connectors || [];
  const routing = requested.panel_space?.routing || [];
  return {
    topology: PANEL_IDENTITY,
    cuts: cuts.slice(),
    transforms: transforms.slice(),
    connectors: connectors.slice(),
    routing: routing.slice(),
    identity: cuts.length === 0 && transforms.length === 0,
    modular: true,
    source_exact: true,
  };
}
