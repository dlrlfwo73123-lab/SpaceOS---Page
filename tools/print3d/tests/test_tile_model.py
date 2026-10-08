import json
from pathlib import Path

import pytest
import trimesh
from shapely.geometry import Polygon
from shapely.ops import unary_union

import print_profile
import threemf
import tile_model as tm

ROOT = Path(__file__).resolve().parents[1]
OSM = tm.load_osm(ROOT.parent / "ground" / "fixtures" / "synthetic_osm.json")
PROFILE = json.loads((ROOT / "profiles" / "example_profile.json").read_text(encoding="utf-8"))
CENTER = (37.5446, 127.0557)
FLOORS = [{"level": 1, "vacant": False}, {"level": 2, "vacant": True, "certainty": "confirmed"},
          {"level": 3, "vacant": True, "certainty": "probable"}, {"level": 4, "vacant": True},
          {"level": 5, "vacant": False}]


def model(**kw):
    args = dict(half_m=100, scale=1000, floors=FLOORS, select_radius_m=80)
    args.update(kw)
    return tm.build_model(OSM, *CENTER, PROFILE, **args)


def test_requires_machine_limits():
    with pytest.raises(print_profile.ProfileError):
        tm.build_model(OSM, *CENTER, None)
    with pytest.raises(print_profile.ProfileError):
        tm.build_model(OSM, *CENTER, {"printer": "x"})


def test_model_validates_and_is_watertight():
    m = model()
    v = tm.validate_model(m, PROFILE)
    assert v["ok"], v["issues"]
    assert v["extents_mm"][0] == pytest.approx(200, abs=1e-6) and v["extents_mm"][1] == pytest.approx(200, abs=1e-6)
    assert {"base", "carriageway", "sidewalk", "crosswalk"} <= set(m["parts"])


def test_scale_controls_plate_and_building_height():
    for scale, half in ((1000, 100), (2000, 200)):
        m = model(scale=scale, half_m=half, floors=None)
        assert m["report"]["plate_mm"] == [pytest.approx(200), pytest.approx(200)]
        k = 1000 / scale
        # height 태그 건물(9, 12.5, 21, 30 m)의 상단 높이(mm) = 판 두께 + m*1000/scale
        tops = {round(body.bounds[1][2] - tm.PLATE_MM, 3)
                for body in m["parts"].get("buildings_measured", trimesh.Trimesh()).split(only_watertight=False)}
        assert tops and tops <= {round(h * k, 3) for h in (9, 12.5, 21, 30)}, (scale, tops)
        # 태그 없는 건물(기본 7m)은 추정 파트
        est_tops = {round(body.bounds[1][2] - tm.PLATE_MM, 3) for body in m["parts"]["buildings_estimated"].split(only_watertight=False)}
        assert round(7.0 * k, 3) in est_tops


def _bottom_footprint(mesh):
    """판 위에 놓인 바닥면(법선 -z) 삼각형들의 평면 폴리곤 목록"""
    out = []
    for f, n in zip(mesh.faces, mesh.face_normals):
        if n[2] < -0.9 and abs(mesh.vertices[f][:, 2].max() - tm.PLATE_MM) < 1e-6:  # 층 슬래브처럼 위로 쌓인 면은 제외
            out.append(Polygon(mesh.vertices[f][:, :2]))
    return out


def test_parts_do_not_overlap_in_plan():
    m = model()
    per_part = {n: _bottom_footprint(mesh) for n, mesh in m["parts"].items() if n != "base"}
    total = sum(p.area for ps in per_part.values() for p in ps)
    union = unary_union([p for ps in per_part.values() for p in ps]).area
    assert total > 0 and total == pytest.approx(union, rel=1e-3)


def test_unknown_certainty_is_not_promoted_to_confirmed():
    m = model()
    r = m["report"]["parts"]
    assert r["floors_confirmed"]["bodies"] == 1                        # level 2 만 확정
    assert m["parts"]["floors_probable"].volume == pytest.approx(2 * m["parts"]["floors_confirmed"].volume, rel=1e-6)  # level 3,4(미상 포함)
    assert m["report"]["selected_building"]["floors"] == 5


def test_exceeds_bed_is_reported():
    m = tm.build_model(OSM, *CENTER, PROFILE, half_m=160, scale=1000)   # 320mm 판 > 베드 220mm
    v = tm.validate_model(m, PROFILE)
    assert not v["ok"] and any(i["issue"] == "exceeds_bed" for i in v["issues"])


def test_drop_thin_removes_sub_min_wall_pieces():
    thin = Polygon([(0, 0), (30, 0), (30, 0.5), (0, 0.5)])     # 폭 0.5mm < 0.8
    ok = Polygon([(0, 5), (30, 5), (30, 8), (0, 8)])
    g, dropped = tm._drop_thin(unary_union([thin, ok]), 0.8)
    assert dropped == 1 and g.area == pytest.approx(ok.area, rel=0.05)


def test_3mf_roundtrip(tmp_path):
    m = model()
    files = tm.export_model(m, tmp_path)
    summary = threemf.read_3mf_summary(tmp_path / files["3mf"])
    assert [s["name"] for s in summary] == list(m["parts"])
    for s in summary:
        assert s["triangles"] == len(m["parts"][s["name"]].faces)
        assert s["color"].startswith("#") and len(s["color"]) == 9
        assert max(s["bounds"][1][:2]) <= 200 + 1e-3
    back = trimesh.load(tmp_path / "model_all.stl")
    assert back.bounds[1][0] == pytest.approx(m["parts"]["base"].bounds[1][0], abs=1e-3)
    assert (tmp_path / "parts" / "sidewalk.stl").exists()


def test_cli_refuses_without_profile(tmp_path):
    import subprocess
    import sys
    r = subprocess.run([sys.executable, str(ROOT / "tile_model.py"), "--osm", "x", "--center", "37.5,127.0", "--out", str(tmp_path)],
                       capture_output=True, text=True)
    assert r.returncode != 0 and "--profile" in r.stderr
