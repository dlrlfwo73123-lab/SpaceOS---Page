import json
from pathlib import Path

import pytest
from shapely.ops import transform as shp_transform

import osm_ground as og
import tiles as tl

FIX = Path(__file__).resolve().parents[1] / "fixtures" / "synthetic_osm.json"
OSM = json.loads(FIX.read_text(encoding="utf-8"))


def surfaces():
    return og.build_surfaces(OSM)


def test_road_width_rules():
    assert og.road_width({"highway": "primary", "width": "12 m"}) == (12.0, "tag")
    assert og.road_width({"highway": "primary", "lanes": "4"}) == (12.0, "lanes")
    assert og.road_width({"highway": "residential"}) == (6.0, "class_default")


def test_kinds_present():
    assert {s.kind for s in surfaces()} == {"carriageway", "sidewalk", "crosswalk"}


def test_pedestrian_footway_is_not_carriageway():
    only_footway = {"elements": [e for e in OSM["elements"]
                                 if e["tags"] == {"highway": "footway"}]}
    assert len(only_footway["elements"]) == 1
    assert og.build_surfaces(only_footway) == []


def test_estimated_flag_matches_width_source():
    for s in surfaces():
        if s.estimated:
            assert s.width_sources - {"tag"}, s.kind
        else:
            assert s.width_sources == {"tag"}


def test_sidewalk_does_not_overlap_carriageway():
    s = surfaces()
    car = og.unary_union([x.geom for x in s if x.kind == "carriageway"])
    for x in s:
        if x.kind == "sidewalk":
            assert x.geom.intersection(car).area < 1e-6


def test_estimated_ratio_in_range():
    r = og.estimated_area_ratio(surfaces())
    assert 0 < r < 1


def test_tile_mesh_area_matches_clipped_polygon():
    s = [x for x in surfaces() if x.kind == "carriageway"][0]
    ts = tl.tiles_for([s])
    assert len(ts) >= 2  # 타일 경계를 가로지름
    total = 0.0
    for t in ts.values():
        L = t["layers"][0]
        pos, idx = L["positions"], L["indices"]
        assert max(idx) < len(pos) // 2 and len(idx) % 3 == 0
        for a, b, c in zip(idx[0::3], idx[1::3], idx[2::3]):
            pts = [og.TO_M(pos[2 * i], pos[2 * i + 1]) for i in (a, b, c)]
            (x1, y1), (x2, y2), (x3, y3) = pts
            total += abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)) / 2
    assert total == pytest.approx(s.geom.area, rel=0.01)


def test_tile_key_and_index(tmp_path):
    assert tl.tile_key(37.5446, 127.0557) == "3754_12705"
    ts = tl.tiles_for(surfaces())
    p = tl.write_tiles(ts, tmp_path, {"synthetic": True})
    idx = json.loads(p.read_text(encoding="utf-8"))
    assert idx["tiles"] == sorted(ts) and idx["meta"]["synthetic"] is True
    assert all((tmp_path / f"{k}.json").exists() for k in idx["tiles"])


def test_overpass_query_has_bbox():
    q = og.overpass_query((37.5, 127.0, 37.6, 127.1))
    assert "37.5,127.0,37.6,127.1" in q and q.rstrip().endswith("out geom;")


def test_write_tiles_merges_and_records_gu(tmp_path):
    ts = tl.tiles_for(surfaces())
    keys = sorted(ts)
    tl.write_tiles({keys[0]: ts[keys[0]]}, tmp_path, {"source": "s", "attribution": "a", "synthetic": True, "generated": "d"}, gu_code="11200")
    tl.write_tiles({k: ts[k] for k in keys[1:]}, tmp_path, {"source": "s", "attribution": "a", "synthetic": True, "generated": "d"}, gu_code="11680")
    idx = json.loads((tmp_path / "index.json").read_text(encoding="utf-8"))
    assert idx["tiles"] == keys and set(idx["gu"]) == {"11200", "11680"}
    assert all("area_m2" in json.loads((tmp_path / f"{k}.json").read_text(encoding="utf-8")) for k in keys)
    tl.write_tiles({}, tmp_path, {}, clean=True)
    assert json.loads((tmp_path / "index.json").read_text(encoding="utf-8"))["tiles"] == []


def test_simplify_keeps_area_within_1_percent(monkeypatch):
    monkeypatch.setattr(og, "SIMPLIFY_M", 0.0)
    raw = {s.kind + str(s.estimated): s.geom.area for s in og.build_surfaces(OSM)}
    monkeypatch.setattr(og, "SIMPLIFY_M", 0.2)
    simp = {s.kind + str(s.estimated): s.geom.area for s in og.build_surfaces(OSM)}
    assert raw.keys() == simp.keys()
    for k in raw:
        assert simp[k] == pytest.approx(raw[k], rel=0.01), k


import osm_buildings as ob


def test_building_height_rules():
    assert ob.building_height({"height": "21 m"}) == (21.0, None, "tag")
    assert ob.building_height({"building:levels": "5"}) == (17.5, 5, "levels")
    assert ob.building_height({"height": "9", "building:levels": "3"}) == (9.0, 3, "tag")
    assert ob.building_height({}) == (ob.DEFAULT_H, None, "default")


def test_buildings_filtered_and_flagged():
    b = ob.build_buildings(OSM)
    assert len(b) == 48  # 4x4칸 x 3동. 열린 way와 5㎡ 미만은 제외
    by_src = {x["src"] for x in b}
    assert by_src == {"tag", "levels", "default"}
    for x in b:
        assert x["e"] == (x["src"] != "tag") and len(x["r"]) % 2 == 0 and len(x["r"]) >= 6


def test_buildings_land_in_tiles(tmp_path):
    b = ob.build_buildings(OSM)
    ts = tl.tiles_for(surfaces(), b)
    assert sum(len(t.get("buildings", [])) for t in ts.values()) == len(b)
    for k, t in ts.items():
        for x in t.get("buildings", []):
            assert x["e"] in (0, 1) and x["h"] > 0
    assert og.overpass_query((1, 2, 3, 4)).count('["building"]') == 1
