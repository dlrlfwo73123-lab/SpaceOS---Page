"""WGS84 lon/lat -> metre CRS -> local origin -> print millimetres."""
from __future__ import annotations

from pyproj import Transformer

# Korea 2000 / Central Belt 2010: a metre CRS suitable for Seoul.
DEFAULT_CRS = "EPSG:5186"


def make_transformer(crs: str = DEFAULT_CRS) -> Transformer:
    # always_xy: input order is (lon, lat), never (lat, lon)
    return Transformer.from_crs("EPSG:4326", crs, always_xy=True)


def project_ring(coords, transformer: Transformer) -> list[tuple[float, float]]:
    return [transformer.transform(x, y) for x, y, *_ in coords]


def to_print_mm(length_m: float, scale_denominator: float) -> float:
    """Print length (mm) = real length (m) * 1000 / scale denominator."""
    if scale_denominator <= 0:
        raise ValueError("scale denominator must be positive")
    return length_m * 1000.0 / scale_denominator
