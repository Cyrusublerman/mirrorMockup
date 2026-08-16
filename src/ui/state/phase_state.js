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
export const PRODUCTION_ROOMS = Object.freeze(["POSE", "SCENE", "RECURSION"]);

export const PHASE_TO_ROOM = Object.freeze({
  DECLARE: "POSE",
  SOLVE: "SCENE",
  STAGE: "SCENE",
  POSE: "POSE",
  SCENE: "SCENE",
  RECURSION: "RECURSION",
});

export class PhaseState {
  constructor() {
    this.phase = "DECLARE";
    this.room_id = "POSE";
    this.output = "FINAL_CAMERA";
    this.input = "VIEWPORT";
  }

  setPhase(name) {
    if (PRODUCTION_ROOMS.includes(name)) {
      this.room_id = name;
      return;
    }
    if (!PHASES.includes(name)) throw new Error(`unknown phase ${name}`);
    this.phase = name;
    this.room_id = PHASE_TO_ROOM[name];
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
    return this.room_id || PHASE_TO_ROOM[this.phase];
  }
}
