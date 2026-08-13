export function evaluateGrip(phoneEval, requested) {
  return {
    authority: requested.phone.authority,
    grip_world: phoneEval.grip_world,
    contacts: ["palm", "index", "middle", "ring", "thumb"],
  };
}
