export const PHASES = Object.freeze(["DECLARE", "SOLVE", "STAGE"]);
export const OUTPUT_MODES = Object.freeze([
  "FINAL_CAMERA",
  "COMPOSITION",
  "MASK",
  "RECURSION",
  "STAGING",
  "FULL_SENSOR",
]);
export const INPUT_MODES = Object.freeze(["VIEWPORT", "NUMBERS", "PLAN", "ELEVATION", "FEASIBLE"]);

// Renderer context only. These are not user-facing rooms; v5 explicitly replaces
// object-category rooms with DECLARE / SOLVE / STAGE.
export const PHASE_TO_ROOM = Object.freeze({
  DECLARE: "POSE",
  SOLVE: "SCENE",
  STAGE: "SCENE",
});

export class PhaseState {
  constructor() {
    this.phase = "DECLARE";
    this.output = "FINAL_CAMERA";
    this.input = "VIEWPORT";
  }

  setPhase(name) {
    if (!PHASES.includes(name)) throw new Error(`unknown phase ${name}`);
    this.phase = name;
  }

  setOutput(name) {
    if (!OUTPUT_MODES.includes(name)) throw new Error(`unknown output ${name}`);
    this.output = name;
  }

  setInput(name) {
    if (!INPUT_MODES.includes(name)) throw new Error(`unknown input ${name}`);
    this.input = name;
  }

  room() {
    return PHASE_TO_ROOM[this.phase];
  }
}
