from pathlib import Path

p = Path("src/scene/solve_network.js")
s = p.read_text()
replacements = [
    ("face: pose.fk?.head,", "face: pose.fk?.face_reference || pose.fk?.head,"),
    ("const aperture_band = apertureBand.evaluate({ camera: cam, face: pose.fk?.head, mirror, stature: req.body?.definition?.stature || 1.7 });", "const aperture_band = apertureBand.evaluate({ camera: cam, face: pose.fk?.face_reference || pose.fk?.head, mirror, stature: req.body?.definition?.stature || 1.7 });"),
    ("const face = cur.pose?.fk?.head;", "const face = cur.pose?.fk?.face_reference || cur.pose?.fk?.head;"),
    ("  const area = Math.abs(cur.carrier_p?.area_capture ?? cur.carrier_p?.area ?? 0);\n  if (area > 1e-12) req.apparatus.preserved_reflected_phone_ratio = area;\n", ""),
]
for old, new in replacements:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one occurrence, got {count}: {old!r}")
    s = s.replace(old, new, 1)
p.write_text(s)
print("patched solve_network.js exactly")
