export function bindNumeric(root, dispatch) {
  root.querySelectorAll("input[data-num]").forEach((el) => {
    el.onchange = () => {
      const name = el.dataset.num;
      const v = Number(el.value);
      if (name === "MOVE_PHONE") {
        const inputs = [...root.querySelectorAll('input[data-num="MOVE_PHONE"]')];
        dispatch(name, { translation: inputs.map((i) => Number(i.value)) });
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
      const field = el.dataset.field;
      dispatch(name, { [field]: v });
    };
  });
}
