"""Machine limits. Printing is never confirmed without them."""
from __future__ import annotations

REQUIRED = ("printer", "bed_x_mm", "bed_y_mm", "bed_z_mm", "nozzle_mm", "material", "min_wall_mm")


class ProfileError(ValueError):
    pass


def validate_profile(profile: dict | None) -> dict:
    if not profile:
        raise ProfileError("print profile missing: printer/bed/nozzle/material/min wall are required")
    missing = [k for k in REQUIRED if profile.get(k) in (None, "")]
    if missing:
        raise ProfileError(f"print profile incomplete, missing: {', '.join(missing)}")
    return profile


def fits_bed(extents, profile: dict) -> bool:
    p = validate_profile(profile)
    ex, ey, ez = extents
    return ex <= p["bed_x_mm"] and ey <= p["bed_y_mm"] and ez <= p["bed_z_mm"]
