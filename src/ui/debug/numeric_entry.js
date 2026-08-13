function vecInputs(root, name) {
  return [...root.querySelectorAll(`input[data-num="${name}"]`)].map((i) => Number(i.value));
}

export function bindNumeric(root, dispatch) {
  root.querySelectorAll("input[data-num]").forEach((el) => {
    el.onchange = () => {
      const name = el.dataset.num;
      const v = Number(el.value);
      if (name === "MOVE_PHONE") {
        dispatch(name, { translation: vecInputs(root, "MOVE_PHONE") });
        return;
      }
      if (name === "SET_CAMERA_FOV") {
        dispatch(name, { hfov: (v * Math.PI) / 180 });
        return;
      }
      if (name === "SET_MIRROR_DISTANCE") {
        dispatch(name, { d_M: v });
        return;
      }
      if (name === "SET_BODY_FRAME_TARGET") {
        const g = (f) => Number(root.querySelector(`input[data-num="SET_BODY_FRAME_TARGET"][data-field="${f}"]`).value);
        dispatch(name, {
          translation: [g("x"), g("y"), g("z")],
          yaw: (g("yaw_deg") * Math.PI) / 180,
        });
        return;
      }
      if (name === "SET_ANATOMICAL_DOF") {
        const joint = el.dataset.joint;
        const g = (f) => Number(root.querySelector(`input[data-num="SET_ANATOMICAL_DOF"][data-joint="${joint}"][data-field="${f}"]`).value);
        dispatch(name, { joint, bend: g("bend"), tilt: g("tilt"), twist: g("twist") });
        return;
      }
      if (name === "CHOOSE_IK_BRANCH") {
        dispatch(name, { chain: "arm_R", branch: v < 0 ? -1 : 1 });
        return;
      }
      if (name === "PAN_MIRROR_WINDOW") {
        dispatch(name, { uv: vecInputs(root, "PAN_MIRROR_WINDOW") });
        return;
      }
      if (name === "PAN_APPARATUS") {
        dispatch(name, { pan: vecInputs(root, "PAN_APPARATUS") });
        return;
      }
      if (name === "PAN_OUTER_FRAME") {
        dispatch(name, { pan: vecInputs(root, "PAN_OUTER_FRAME") });
        return;
      }
      if (name === "PAN_REFLECTED_CONTENT") {
        dispatch(name, { delta: vecInputs(root, "PAN_REFLECTED_CONTENT") });
        return;
      }
      if (name === "SET_MIRROR_APERTURE") {
        const field = el.dataset.field;
        dispatch(name, { [field]: v });
        return;
      }
      if (name === "SET_RECURSION_PARAMETER") {
        dispatch(name, { [el.dataset.field]: v });
        return;
      }
      if (name === "SET_CONTENT_Q") {
        const field = el.dataset.field;
        if (field === "offset") {
          const inputs = [...root.querySelectorAll('input[data-num="SET_CONTENT_Q"][data-field="offset"]')];
          dispatch(name, { offset: inputs.map((i) => Number(i.value)) });
          return;
        }
        dispatch(name, { [field]: v });
        return;
      }
      const field = el.dataset.field;
      dispatch(name, { [field]: v });
    };
  });
}
