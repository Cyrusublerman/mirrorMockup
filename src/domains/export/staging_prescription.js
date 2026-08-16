const HOLLOW = new Set(["HYPOTHESIS", "PROVISIONAL", "UNMEASURED", "UNRESOLVED"]);
const SOLID = new Set(["MEASURED", "CALIBRATED"]);

export class StagingPrescription {
  classify(status) {
    const s = String(status || "HYPOTHESIS").toUpperCase();
    if (SOLID.has(s)) return "solid";
    if (s === "DERIVED") return "derived";
    return "hollow";
  }

  build(requested, effective) {
    const camStatus = requested.camera?.epistemic_status || "HYPOTHESIS";
    const bodyStatus = requested.body?.definition?.epistemic_status || "PROVISIONAL";
    const widthStatus = requested.phone?.width_epistemic || "ASSUMED";
    const distances = [
      { id: "stand_m", value: effective.feasible?.m ?? effective.apparatus?.d_M, status: camStatus },
      { id: "phone_forward_m", value: effective.feasible?.u, status: camStatus },
      { id: "phone_offset_m", value: effective.feasible?.e, status: camStatus },
      { id: "camera_height_m", value: effective.camera?.world?.translation?.[2], status: camStatus },
      { id: "stature_m", value: requested.body?.definition?.stature, status: bodyStatus },
      { id: "phone_width_m", value: requested.phone?.body_dimensions_m?.width, status: widthStatus },
    ];
    const printed = distances.map((d) => {
      let mark = this.classify(d.status);
      if (mark === "derived" && this.classify(camStatus) === "hollow") mark = "hollow";
      return { ...d, mark };
    });
    const hollow = printed.filter((d) => d.mark === "hollow");
    const card = {
      stand_m: effective.feasible?.m,
      turn_deg: 0,
      phone_forward_m: effective.feasible?.u,
      phone_above_eye_m: (effective.camera?.world?.translation?.[2] || 0) - 1.55,
      phone_lateral_m: effective.feasible?.e,
      hold: "right hand, same side",
      lens: "front, 1x",
      weight: "both feet",
    };
    return {
      refused: hollow.length > 0,
      hollow: hollow.map((d) => d.id),
      printed,
      card,
      topology: "FRONT_CAMERA_SELFIE",
      synthesis: true,
    };
  }
}
