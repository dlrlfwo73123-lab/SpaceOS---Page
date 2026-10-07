"""Generate the synthetic seed fixture. NOT real Gold data: coordinates and values are invented
test inputs placed near Seoul so projection can be exercised."""
import json
from pathlib import Path

from pyproj import Transformer

inv = Transformer.from_crs("EPSG:5186", "EPSG:4326", always_xy=True)
X0, Y0 = 202000.0, 447000.0  # arbitrary local-metre anchor in EPSG:5186


def rect(x, y, w, d):
    pts = [(x, y), (x + w, y), (x + w, y + d), (x, y + d), (x, y)]
    return {"type": "Polygon", "coordinates": [[list(inv.transform(X0 + a, Y0 + b)) for a, b in pts]]}


def bowtie():
    pts = [(60, 0), (80, 20), (80, 0), (60, 20), (60, 0)]
    return {"type": "Polygon", "coordinates": [[list(inv.transform(X0 + a, Y0 + b)) for a, b in pts]]}


def feat(pnu, bid, geom, h, floors, cert):
    return {"type": "Feature", "geometry": geom,
            "properties": {"pnu": pnu, "building_id": bid, "height_m": h, "floors": floors,
                           "floor_certainty": cert, "source": "synthetic_fixture"}}


fc = {"type": "FeatureCollection", "name": "synthetic seed fixture - not real data", "features": [
    feat("SYN-001", "syn-b1", rect(0, 0, 20, 20), 15.22, 5, "confirmed"),
    feat("SYN-002", "syn-b2", rect(25, 0, 15, 25), 12.0, 4, "probable"),
    feat("SYN-003", "syn-b3", rect(45, 0, 10, 10), 9.0, 3, "confirmed"),
    feat("SYN-003", "syn-b4", rect(45, 15, 10, 10), 9.0, 3, "confirmed"),  # duplicate pnu
    feat("SYN-005", "syn-b5", rect(0, 30, 12, 12), 0, 3, "probable"),       # height 0
    feat("SYN-006", "syn-b6", bowtie(), 10.0, 3, "confirmed"),              # invalid geometry
]}
Path(__file__).with_name("synthetic_blocks.geojson").write_text(
    json.dumps(fc, ensure_ascii=False, indent=1), encoding="utf-8")
