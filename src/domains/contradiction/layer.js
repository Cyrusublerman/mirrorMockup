export function evaluateContradiction(requested) {
  const declared = requested.contradiction || { enabled: false, ops: [] };
  return {
    enabled: !!declared.enabled,
    ops: (declared.ops || []).slice(),
    base_untouched: true,
    non_destructive: true,
  };
}
