"""model.3mf(또는 report.json 이 있는 출력 폴더) → 미리보기 PNG (평면 + 사선). 슬라이서 미리보기를 대체하지 않는다."""
from __future__ import annotations

import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import trimesh  # noqa: E402
from mpl_toolkits.mplot3d.art3d import Poly3DCollection  # noqa: E402

NS = {"m": "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"}


def load_parts(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("3D/3dmodel.model"))
    colors = [b.get("displaycolor")[:7] for b in root.findall(".//m:basematerials/m:base", NS)]
    parts = []
    for o in root.findall(".//m:object", NS):
        v = np.array([[float(x.get(k)) for k in "xyz"] for x in o.findall(".//m:vertex", NS)])
        f = np.array([[int(t.get(k)) for k in ("v1", "v2", "v3")] for t in o.findall(".//m:triangle", NS)])
        parts.append((o.get("name"), colors[int(o.get("pindex"))], v, f))
    return parts


def main(src: str, out: str, title: str) -> None:
    parts = load_parts(Path(src) / "model.3mf")
    # 모든 파트의 면을 하나의 컬렉션으로 합쳐 면 단위 깊이 정렬(파트별 컬렉션은 서로 가려짐)
    # matplotlib 은 면 평균 깊이로 정렬하므로 큰 면(바닥판 등)을 잘게 나눠야 가림 순서가 맞는다(미리보기 전용)
    tris, cols = [], []
    for _, c, v, f in parts:
        sv, sf = trimesh.remesh.subdivide_to_size(v, f, max_edge=6.0)
        tris.append(sv[sf]); cols += [c] * len(sf)
    tris = np.concatenate(tris)
    W = max(p[2][:, 0].max() for p in parts)
    fig = plt.figure(figsize=(13, 6.4))
    for i, (elev, azim, name, zs) in enumerate(((90, -90, "Plan view (top)", 0.12), (36, -58, "Oblique view", 0.5))):
        ax = fig.add_subplot(1, 2, i + 1, projection="3d")
        ax.add_collection3d(Poly3DCollection(tris, facecolors=cols, edgecolor=cols, linewidth=0.2))
        ax.set_xlim(0, W); ax.set_ylim(0, W); ax.set_zlim(0, W * zs)
        ax.set_box_aspect((1, 1, zs))
        ax.view_init(elev, azim)
        ax.set_title(name, fontsize=10)
        ax.set_xlabel("mm"); ax.set_ylabel("mm")
        if i == 0:
            ax.set_zticks([])
    handles = [plt.Line2D([0], [0], marker="s", linestyle="", color=c, markeredgecolor="#888", markersize=9, label=n) for n, c, _, _ in parts]
    fig.legend(handles=handles, loc="lower center", ncol=min(5, len(handles)), fontsize=8, frameon=False)
    fig.suptitle(title, fontsize=11)
    fig.tight_layout(rect=(0, 0.07, 1, 0.95))
    fig.savefig(out, dpi=120)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "Print model preview")
