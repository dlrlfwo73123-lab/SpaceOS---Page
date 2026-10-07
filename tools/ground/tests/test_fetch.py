import json
from pathlib import Path

import pytest

import fetch_ground as fg


def test_presets_cover_25_gu_with_sane_bbox():
    assert len(fg.PRESETS) == 25
    for code, v in fg.PRESETS.items():
        s, w, n, e = v["bbox"]
        assert 37.3 < s < n < 37.8 and 126.7 < w < e < 127.3, code
        assert v["slug"] and v["name"].endswith("구")
    assert fg.PRESETS["11200"]["slug"] == "seongdong"


def test_resolve_gu_by_slug_code_all():
    assert fg.resolve_gu("seongdong") == ["11200"] == fg.resolve_gu("11200")
    assert len(fg.resolve_gu("all")) == 25
    with pytest.raises(SystemExit):
        fg.resolve_gu("atlantis")


def test_chunks_cover_bbox_without_gaps():
    bbox = (37.516, 127.0, 37.58, 127.086)
    cs = list(fg.chunks(bbox, 0.04))
    assert min(c[0] for c in cs) == bbox[0] and max(c[2] for c in cs) == bbox[2]
    assert min(c[1] for c in cs) == bbox[1] and max(c[3] for c in cs) == bbox[3]
    assert len(cs) == 2 * 3


def test_offline_without_cache_fails(tmp_path, monkeypatch):
    monkeypatch.setattr(fg, "REPO", tmp_path)
    with pytest.raises(SystemExit):
        fg.load_gu_raw("11200", 0.04, 0, offline=True)
