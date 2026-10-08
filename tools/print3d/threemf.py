"""최소 3MF(색 파트) 작성기: 파트마다 객체 하나 + 색 하나(basematerials). 외부 의존성 없음(zipfile).

슬라이서(PrusaSlicer/Orca/Bambu 등)는 객체별 색을 필라멘트/익스트루더에 매핑할 수 있다. 색 프로파일이
모든 장비에 그대로 호환된다고 주장하지 않는다(보고서 3장).
"""
from __future__ import annotations

import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'
)
RELS = (
    '<?xml version="1.0" encoding="UTF-8"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Target="/3D/3dmodel.model" Id="rel0" '
    'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'
)


def _hex(c: str) -> str:
    c = c.lstrip("#").upper()
    if len(c) != 6:
        raise ValueError(f"색은 #RRGGBB 형식: {c}")
    return "#" + c + "FF"


def write_3mf(parts: list[dict], path: str | Path) -> Path:
    """parts: [{'name': str, 'mesh': trimesh.Trimesh(mm), 'color': '#rrggbb'}]"""
    mats = "".join(f'<base name="{escape(p["name"])}" displaycolor="{_hex(p["color"])}"/>' for p in parts)
    objs, items = [], []
    for i, p in enumerate(parts):
        m = p["mesh"]
        verts = "".join(f'<vertex x="{x:.4f}" y="{y:.4f}" z="{z:.4f}"/>' for x, y, z in m.vertices)
        tris = "".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in m.faces)
        oid = i + 2  # id 1 = basematerials
        objs.append(f'<object id="{oid}" name="{escape(p["name"])}" type="model" pid="1" pindex="{i}">'
                    f"<mesh><vertices>{verts}</vertices><triangles>{tris}</triangles></mesh></object>")
        items.append(f'<item objectid="{oid}"/>')
    model = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">'
        f'<resources><basematerials id="1">{mats}</basematerials>{"".join(objs)}</resources>'
        f'<build>{"".join(items)}</build></model>'
    )
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("3D/3dmodel.model", model)
    return path


def read_3mf_summary(path: str | Path) -> list[dict]:
    """다시 읽어 파트별 {name, color, vertices, triangles, bounds}를 돌려준다(왕복 검증용)."""
    import re
    import xml.etree.ElementTree as ET

    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("3D/3dmodel.model"))
    ns = {"m": "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"}
    colors = [b.get("displaycolor") for b in root.findall(".//m:basematerials/m:base", ns)]
    out = []
    for o in root.findall(".//m:object", ns):
        vs = [(float(v.get("x")), float(v.get("y")), float(v.get("z"))) for v in o.findall(".//m:vertex", ns)]
        tri = o.findall(".//m:triangle", ns)
        lo = [min(v[k] for v in vs) for k in range(3)] if vs else None
        hi = [max(v[k] for v in vs) for k in range(3)] if vs else None
        out.append({"name": o.get("name"), "color": colors[int(o.get("pindex"))], "vertices": len(vs),
                    "triangles": len(tri), "bounds": (lo, hi)})
    assert re.match(r"^#[0-9A-F]{8}$", out[0]["color"]) if out else True
    return out
