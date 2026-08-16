from pathlib import Path

p = Path("src/scene/solve_network.js")
s = p.read_text()

old = "face: pose.fk?.head,"
new = "face: pose.fk?.face_reference || pose.fk?.head,"
count = s.count(old)
if count != 2:
    raise SystemExit(f"expected exactly two pose face sites, got {count}")
s = s.replace(old, new)

old = "const face = cur.pose?.fk?.head;"
new = "const face = cur.pose?.fk?.face_reference || cur.pose?.fk?.head;"
count = s.count(old)
if count != 1:
    raise SystemExit(f"expected exactly one feasible projection face site, got {count}")
s = s.replace(old, new, 1)

old = "  const area = Math.abs(cur.carrier_p?.area_capture ?? cur.carrier_p?.area ?? 0);\n  if (area > 1e-12) req.apparatus.preserved_reflected_phone_ratio = area;\n"
count = s.count(old)
if count != 1:
    raise SystemExit(f"expected exactly one preserve-target rewrite, got {count}")
s = s.replace(old, "", 1)

p.write_text(s)
print("patched solve_network.js exactly")
