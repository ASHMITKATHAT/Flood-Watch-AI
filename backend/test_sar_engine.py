"""
Test script for EQUINOX SAR Engine (Phase 4)
=============================================
Tests the Sentinel-1 SAR inundation detection module.
Works regardless of whether GEE key is present (tests graceful fallback).
"""

import json
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

from sar_engine import get_inundation_metrics, _gee_ready

# ── Test coordinates ────────────────────────
TEST_CASES = [
    {"name": "Jodhpur (Default)",     "lat": 26.9124, "lng": 75.7873},
    {"name": "Patiala (Punjab)",      "lat": 30.3398, "lng": 76.3869},
    {"name": "Jaipur (Rajasthan)",    "lat": 26.9124, "lng": 75.7873, "radius_km": 10},
]


def main():
    print("=" * 60)
    print("  EQUINOX SAR Engine — Test Suite")
    print("=" * 60)
    print(f"  GEE Initialised: {_gee_ready}")
    print()

    all_passed = True

    for tc in TEST_CASES:
        name = tc.pop("name")
        print(f"▶ Testing: {name}")
        print(f"  Coords: ({tc['lat']}, {tc['lng']})")

        result = get_inundation_metrics(**tc)

        # Restore name key for next iteration clarity
        tc["name"] = name

        # Validate structure
        required_keys = [
            "status", "lat", "lng", "recent_image_date",
            "flooded_area_hectares", "total_area_hectares",
            "flood_fraction_pct", "threshold_db", "message",
        ]
        missing = [k for k in required_keys if k not in result]
        if missing:
            print(f"  ❌ FAIL — Missing keys: {missing}")
            all_passed = False
        else:
            print(f"  ✅ PASS — Status: {result['status']}")

        print(f"  Response:\n{json.dumps(result, indent=4)}")
        print()

    print("=" * 60)
    if all_passed:
        print("  ✅ All tests passed!")
    else:
        print("  ❌ Some tests failed.")
    print("=" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
