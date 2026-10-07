import json
from pathlib import Path

import numpy as np
import pytest
import trimesh

import audit as au
import coordinates
import evidence
import layout
import manifest
import massing
import print_profile
from export_mesh import export_block, roundtrip_ok
from mesh_checks import check_mesh

FIX = Path(__file__).resolve().parents[1] / "fixtures" / "synthetic_blocks.geojson"
PROFILE = {"printer": "test", "bed_x_mm": 220, "bed_y_mm": 220, "bed_z_mm": 250,
           "nozzle_mm": 0.4, "material": "PLA", "min_wall_mm": 0.8}


def _usable():
    feats = au.load_features(FIX)
    return au.audit(feats, require_height=False)


def test_manifest_pins_commit_and_input_hashes():
    m = manifest.build_manifest([FIX], repo=FIX.parent)
    assert m["commit"] is None or len(m["commit"]) == 40
    assert len(m["inputs"][str(FIX)]) == 64
    assert m["tools"]["trimesh"] != "missing" and m["tools"]["python"]


def test_gold_join_reports_ambiguous_pnu():
    res = _usable()
    reasons = {e["id"]: e["reason"] for e in res["excluded"]}
    assert reasons["syn-b3"] == reasons["syn-b4"] == "ambiguous_pnu"
    assert "syn-b3" not in [f["properties"]["building_id"] for f in res["usable"]]


def test_missing_height_fails_without_default():
    with pytest.raises(au.AuditError):
        au.audit(au.load_features(FIX), require_height=True)
    reasons = {e["id"]: e["reason"] for e in _usable()["excluded"]}
    assert reasons["syn-b5"] == "missing_height"
    assert reasons["syn-b6"] == "invalid_geometry"


def test_crs_and_scale_control_lengths():
    # 100 m at 1:1,000 must be 100 mm; 100 m at 1:5,000 must be 20 mm
    assert coordinates.to_print_mm(100, 1000) == pytest.approx(100)
    assert coordinates.to_print_mm(100, 5000) == pytest.approx(20)
    tf = coordinates.make_transformer()
    inv = coordinates.Transformer.from_crs("EPSG:5186", "EPSG:4326", always_xy=True)
    a, b = inv.transform(202000, 447000), inv.transform(202100, 447000)
    (x1, y1), (x2, y2) = tf.transform(*a), tf.transform(*b)
    assert np.hypot(x2 - x1, y2 - y1) == pytest.approx(100, abs=1e-3)
    # lon/lat axis order guard: 20 m building footprint measures 20 mm at 1:1000
    items = massing.build_massing(_usable()["usable"], 1000)
    b1 = next(i for i in items if i["building_id"] == "syn-b1")
    assert b1["mesh"].extents[0] == pytest.approx(20, abs=0.05)
    assert b1["mesh"].extents[2] == pytest.approx(15.22, abs=0.01)
    assert massing.scale_bar(100, 1000).extents[0] == pytest.approx(100)


def test_floor_certainty_is_preserved():
    src = {f["properties"]["building_id"]: f["properties"]["floor_certainty"]
           for f in _usable()["usable"]}
    out = {i["building_id"]: i["floor_certainty"] for i in massing.build_massing(_usable()["usable"])}
    assert out == src and set(out.values()) <= {"confirmed", "probable"}


def test_exported_meshes_are_watertight_solids():
    for it in massing.build_massing(_usable()["usable"]):
        assert it["mesh"].is_watertight and it["mesh"].volume > 0
        assert check_mesh(it["mesh"], PROFILE)["ok"]
    thin = trimesh.creation.box(extents=[0.3, 10, 10])
    assert "below_min_wall" in check_mesh(thin, PROFILE)["issues"]
    open_mesh = trimesh.Trimesh(vertices=[[0, 0, 0], [1, 0, 0], [0, 1, 0]], faces=[[0, 1, 2]])
    assert "not_watertight" in check_mesh(open_mesh, PROFILE)["issues"]


def test_print_profile_requires_machine_limits(tmp_path):
    items = massing.build_massing(_usable()["usable"])
    with pytest.raises(print_profile.ProfileError):
        export_block(items, tmp_path, None)
    with pytest.raises(print_profile.ProfileError):
        export_block(items, tmp_path, {"printer": "x"})
    assert not list(tmp_path.glob("*.stl"))


def test_concept_layout_never_claims_measured():
    with pytest.raises(layout.LayoutError):
        layout.propose_layout(None, [])
    space = {"width_m": 6, "depth_m": 4, "source": "owner concept brief"}
    r = layout.propose_layout(space, [{"name": "counter", "w_m": 2, "d_m": 0.6},
                                      {"name": "table", "w_m": 1, "d_m": 1},
                                      {"name": "huge", "w_m": 9, "d_m": 9}])
    assert r["measured"] is False and r["status"] == "proposed"
    assert all(p["status"] == "proposed" for p in r["placed"])
    assert r["rejected"] == ["huge"]


def test_measured_geometry_requires_evidence():
    assert evidence.classify_geometry({"accuracy_m": 0.03}) == "unverified"  # LiDAR alone proves nothing
    full = {"drawing_ref": "plan-1", "measured_on": "2026-10-01", "measured_by": "tester", "accuracy_m": 0.03}
    assert evidence.classify_geometry(full) == "measured"
    assert evidence.classify_geometry({**full, "accuracy_m": None}) == "unverified"


def test_artifact_roundtrip_preserves_bounds(tmp_path):
    items = massing.build_massing(_usable()["usable"])
    rep = export_block(items, tmp_path, PROFILE)
    assert all(v["exported"] and v["roundtrip_ok"] for v in rep.values())
    for it in items:
        assert roundtrip_ok(it["mesh"], tmp_path / f"{it['building_id']}.stl")


def test_delivery_has_no_secret_files(tmp_path):
    root = Path(__file__).resolve().parents[1]
    assert evidence.scan_delivery(root) == []
    (tmp_path / ".env").write_text("X=1")
    (tmp_path / "a.json").write_text('{"api_' + 'key": "' + 'x' * 20 + '"}')
    assert len(evidence.scan_delivery(tmp_path)) == 2
