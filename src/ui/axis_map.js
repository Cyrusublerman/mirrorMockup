export const AXIS_TO_BTT = Object.freeze({ BEND: "bend", TILT: "tilt", ROTATE: "twist" });
export const BTT_TO_AXIS = Object.freeze({ bend: "BEND", tilt: "TILT", twist: "ROTATE" });

export function bttKey(axis) {
  return AXIS_TO_BTT[axis] || "bend";
}

export function axisLabel(btt) {
  return BTT_TO_AXIS[btt] || "BEND";
}

export function precisionJointFields(euler) {
  const e = euler || { bend: 0, tilt: 0, twist: 0 };
  return [
    { key: "bend", label: "Bend (rad)", value: e.bend || 0 },
    { key: "tilt", label: "Tilt (rad)", value: e.tilt || 0 },
    { key: "twist", label: "Rotate (rad)", value: e.twist || 0 },
  ];
}
