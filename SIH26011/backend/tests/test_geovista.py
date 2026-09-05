"""
GeoVISTA — Complete Backend Test Suite
Strict 100% pass requirement: never weaken tests to achieve passing.
Tests cover all PS26011 functionality.
"""
import pytest
from httpx import AsyncClient, ASGITransport

@pytest.fixture(scope="module")
def app():
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from app.main import app as _app
    return _app

@pytest.fixture(autouse=True)
def reset_db(app):
    """Reset all application state before each test for full isolation."""
    from app.repositories.data_repository import repository
    repository.reset_data()


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_health(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "HEALTHY"
    assert "GeoVISTA" in data["project"]
    assert data["problem_statement"] == "PS26011"
    assert "privacy" in data

# ─────────────────────────────────────────────
# PARCELS
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_parcels(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/parcels")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 5  # 3 urban + 3 rural

@pytest.mark.asyncio
async def test_get_urban_parcels(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/parcels?area_type=URBAN")
    assert r.status_code == 200
    parcels = r.json()
    assert all(p["area_type"] == "URBAN" for p in parcels)
    assert len(parcels) >= 3

@pytest.mark.asyncio
async def test_get_rural_parcels(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/parcels?area_type=RURAL")
    assert r.status_code == 200
    parcels = r.json()
    assert all(p["area_type"] == "RURAL" for p in parcels)
    assert len(parcels) >= 3

@pytest.mark.asyncio
async def test_get_parcel_by_id(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/parcels/parcel-urban-001")
    assert r.status_code == 200
    data = r.json()
    assert data["parcel_code"] == "P001"
    assert data["is_synthetic"] is True

@pytest.mark.asyncio
async def test_get_parcel_by_code(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/parcels/P001")
    assert r.status_code == 200
    assert r.json()["parcel_code"] == "P001"

@pytest.mark.asyncio
async def test_get_parcel_not_found(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/parcels/DOES-NOT-EXIST")
    assert r.status_code == 404

@pytest.mark.asyncio
async def test_parcel_geometry_2d_is_valid(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/parcels/parcel-urban-001")
    parcel = r.json()
    coords = parcel["geometry_2d"]
    assert len(coords) >= 4
    assert parcel["area_sqm"] > 0

# ─────────────────────────────────────────────
# BUILDINGS
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_buildings(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/buildings")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 2

@pytest.mark.asyncio
async def test_get_building_by_id(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/buildings/bld-urban-001")
    assert r.status_code == 200
    bld = r.json()
    assert bld["building_code"] == "B01"
    assert bld["total_floors"] == 5
    assert bld["basement_floors"] == 1
    assert bld["parcel_id"] == "parcel-urban-001"

@pytest.mark.asyncio
async def test_get_building_floors(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/buildings/bld-urban-001/floors")
    assert r.status_code == 200
    floors = r.json()
    assert len(floors) == 6  # Basement + 5 floors
    floor_numbers = [f["floor_number"] for f in floors]
    assert -1 in floor_numbers  # Basement exists

@pytest.mark.asyncio
async def test_building_associated_with_parcel(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/parcels/parcel-urban-001/buildings")
    assert r.status_code == 200
    blds = r.json()
    assert len(blds) >= 1
    assert all(b["parcel_id"] == "parcel-urban-001" for b in blds)

# ─────────────────────────────────────────────
# PROPERTIES
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_properties(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/properties")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 8  # Bld A: 8 units, Bld B: 3 units

@pytest.mark.asyncio
async def test_get_property_by_id(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/properties/prop-b1-u101")
    assert r.status_code == 200
    unit = r.json()
    assert unit["unit_number"] == "101"
    assert unit["floor_number"] == 1
    assert unit["z_min_m"] < unit["z_max_m"]
    assert "IN-MP-BPL" in unit["proposed_3d_id"]
    assert unit["is_synthetic"] is True

@pytest.mark.asyncio
async def test_get_property_by_3d_id(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # Get list first to find an actual 3D id
        r = await c.get("/api/properties")
    unit = r.json()[0]
    pid = unit["proposed_3d_id"]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r2 = await c.get(f"/api/properties/{pid}")
    assert r2.status_code == 200

@pytest.mark.asyncio
async def test_property_geometry(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/properties/prop-b1-u101/geometry")
    assert r.status_code == 200
    geom = r.json()
    assert geom["z_min_m"] < geom["z_max_m"]
    assert geom["area_sqm"] > 0
    assert geom["volume_cum"] > 0
    assert len(geom["footprint_2d"]) >= 4
    bbox = geom["bounding_box_3d"]
    assert "min_z_m" in bbox and "max_z_m" in bbox

@pytest.mark.asyncio
async def test_multiple_floors_exist(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/buildings/bld-urban-001/floors")
    floors = r.json()
    assert len(floors) >= 3

@pytest.mark.asyncio
async def test_multiple_units_per_floor(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/buildings/bld-urban-001/properties")
    units = r.json()
    floor_1_units = [u for u in units if u["floor_number"] == 1]
    assert len(floor_1_units) == 2  # 101 and 102

# ─────────────────────────────────────────────
# 3D ID GENERATION
# ─────────────────────────────────────────────
def test_3d_id_generation():
    from app.services.id_engine import id_engine
    generated = id_engine.generate_3d_identifier(
        country="IN", state_code="MP", city_code="BPL",
        parcel_code="P001", building_code="B01",
        floor_code="F03", unit_code="U02"
    )
    assert generated == "IN-MP-BPL-P001-B01-F03-U02"

def test_3d_id_parsing():
    from app.services.id_engine import id_engine
    parsed = id_engine.parse_3d_identifier("IN-MP-BPL-P001-B01-F03-U02")
    assert parsed["country"] == "IN"
    assert parsed["state_code"] == "MP"
    assert parsed["city_code"] == "BPL"
    assert parsed["parcel_code"] == "P001"
    assert parsed["building_code"] == "B01"
    assert parsed["floor_code"] == "F03"
    assert parsed["unit_code"] == "U02"
    assert "Prototype" in parsed["disclaimer"]
    assert "proposed" in parsed["disclaimer"].lower()

def test_3d_id_contains_no_legal_claims():
    from app.services.id_engine import id_engine
    d = id_engine.PROTOTYPE_DISCLAIMER
    forbidden = ["official Government of India ULPIN", "legal land registration title"]
    for phrase in forbidden:
        assert phrase in d  # Disclaimer must explicitly state it is NOT these things

# ─────────────────────────────────────────────
# VALIDATION ENGINE — ALL 9 RULES
# ─────────────────────────────────────────────
def get_validation_fixtures():
    from app.repositories.data_repository import repository
    from app.services.validation_engine import validation_engine
    repository.reset_data()
    unit = repository.units["prop-b1-u101"]
    all_units = list(repository.units.values())
    bld = repository.buildings[unit.building_id]
    parcel = repository.parcels[unit.parcel_id]
    floors = list(repository.floors.values())
    evs = [e for e in repository.evidences if e.object_id in (unit.id, unit.building_id, unit.parcel_id)]
    return validation_engine, unit, all_units, bld, parcel, floors, evs

def test_rule_01_parcel_containment_passes():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r1 = next(r for r in results if r.rule_id == "RULE_01")
    assert r1.status == "PASS", f"Expected PASS but got {r1.status}: {r1.message}"

def test_rule_02_building_association_passes():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r2 = next(r for r in results if r.rule_id == "RULE_02")
    assert r2.status == "PASS"

def test_rule_03_height_bounds_passes():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r3 = next(r for r in results if r.rule_id == "RULE_03")
    assert r3.status == "PASS"

def test_rule_03_fails_when_zmin_geq_zmax():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    unit.z_min_m = 515.0
    unit.z_max_m = 510.0  # Invalid
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r3 = next(r for r in results if r.rule_id == "RULE_03")
    assert r3.status == "FAIL"
    assert r3.severity == "CRITICAL"

def test_rule_04_no_horizontal_overlap_for_clean_units():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r4 = next(r for r in results if r.rule_id == "RULE_04")
    assert r4.status == "PASS"

def test_rule_05_vertical_overlap_detected_for_unit_302():
    """Scenario 4: Unit 302 must fail RULE_05 (vertical overlap with Unit 301)."""
    ve, _, all_u, _, _, floors, evs = get_validation_fixtures()
    from app.repositories.data_repository import repository
    unit302 = next(u for u in all_u if u.unit_number == "302")
    bld = repository.buildings[unit302.building_id]
    parcel = repository.parcels[unit302.parcel_id]
    results = ve.validate_property(unit302, all_u, bld, parcel, floors, evs)
    r5 = next(r for r in results if r.rule_id == "RULE_05")
    assert r5.status == "FAIL", f"Expected FAIL but got {r5.status}: {r5.message}"
    assert "OVERLAP" in r5.message.upper()
    assert r5.severity == "CRITICAL"

def test_rule_05_passes_after_correction():
    """Scenario 4 Resolution: Officer corrects Unit 302 footprint to u1_right AND Z to 514.0–517.0m."""
    ve, _, all_u, _, _, floors, evs = get_validation_fixtures()
    from app.repositories.data_repository import repository
    unit302 = next(u for u in all_u if u.unit_number == "302")
    # Officer correction: fix both footprint (back to right half) and Z range
    u1_right = [
        [77.41265, 23.2593], [77.4130, 23.2593],
        [77.4130, 23.2600], [77.41265, 23.2600], [77.41265, 23.2593]
    ]
    unit302.footprint_2d = u1_right
    unit302.z_min_m = 514.0
    unit302.z_max_m = 517.0
    bld = repository.buildings[unit302.building_id]
    parcel = repository.parcels[unit302.parcel_id]
    results = ve.validate_property(unit302, all_u, bld, parcel, floors, evs)
    r5 = next(r for r in results if r.rule_id == "RULE_05")
    assert r5.status == "PASS", f"Expected PASS after correction but got {r5.status}: {r5.message}"


def test_rule_06_floor_monotonicity_passes():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r6 = next(r for r in results if r.rule_id == "RULE_06")
    assert r6.status in ("PASS", "WARNING")

def test_rule_07_evidence_completeness_passes():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r7 = next(r for r in results if r.rule_id == "RULE_07")
    assert r7.status == "PASS"

def test_rule_07_fails_when_evidence_missing():
    """Scenario 8: Remove LIDAR and FLOOR_PLAN evidence."""
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    evs_stripped = [e for e in evs if e.source_type not in ("LIDAR", "FLOOR_PLAN")]
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs_stripped)
    r7 = next(r for r in results if r.rule_id == "RULE_07")
    assert r7.status == "WARNING"
    assert "LIDAR" in r7.details.get("missing_sources", []) or "FLOOR_PLAN" in r7.details.get("missing_sources", [])

def test_rule_08_geometry_validity_passes():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r8 = next(r for r in results if r.rule_id == "RULE_08")
    assert r8.status == "PASS"

def test_rule_09_no_conflict_by_default():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r9 = next(r for r in results if r.rule_id == "RULE_09")
    assert r9.status == "PASS"

def test_rule_09_conflict_detected_when_heights_disagree():
    """Scenario 3: Floor plan 30m vs LiDAR 27m -> RULE_09 FAIL."""
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    # Inject conflicting height metadata
    for e in evs:
        if e.source_type == "FLOOR_PLAN":
            e.metadata["estimated_building_height_m"] = 30.0
        if e.source_type == "LIDAR":
            e.metadata["estimated_building_height_m"] = 27.0
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    r9 = next(r for r in results if r.rule_id == "RULE_09")
    assert r9.status == "FAIL"
    assert r9.details["discrepancy_m"] == 3.0

def test_all_9_rules_checked():
    ve, unit, all_u, bld, parcel, floors, evs = get_validation_fixtures()
    results = ve.validate_property(unit, all_u, bld, parcel, floors, evs)
    rule_ids = {r.rule_id for r in results}
    expected = {f"RULE_0{i}" for i in range(1, 10)}
    assert expected == rule_ids, f"Missing rules: {expected - rule_ids}"

# ─────────────────────────────────────────────
# CONFIDENCE ENGINE
# ─────────────────────────────────────────────
def test_confidence_calculation():
    from app.repositories.data_repository import repository
    from app.services.confidence_engine import confidence_engine
    from app.services.validation_engine import validation_engine
    repository.reset_data()
    unit = repository.units["prop-b1-u101"]
    evs = [e for e in repository.evidences if e.object_id in (unit.id, unit.building_id, unit.parcel_id)]
    bld = repository.buildings[unit.building_id]
    parcel = repository.parcels[unit.parcel_id]
    floors = list(repository.floors.values())
    all_units = list(repository.units.values())
    val_results = validation_engine.validate_property(unit, all_units, bld, parcel, floors, evs)
    score = confidence_engine.calculate_confidence(unit, evs, val_results)
    assert 0.0 <= score.overall_score <= 100.0
    assert score.evidence_completeness >= 0.0
    assert score.geometry_quality >= 0.0
    assert score.positional_quality >= 0.0
    assert score.cross_source_agreement >= 0.0
    assert score.validation_score >= 0.0
    # Unit 101 should have high confidence (it's clean, all evidence attached)
    assert score.overall_score >= 70.0

@pytest.mark.asyncio
async def test_confidence_api_endpoint(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/properties/prop-b1-u101/confidence")
    assert r.status_code == 200
    data = r.json()
    assert "overall_score" in data
    assert "label" in data
    assert "Prototype" in data["label"]
    assert "disclaimer" in data
    assert 0 <= data["overall_score"] <= 100

# ─────────────────────────────────────────────
# EVIDENCE
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_evidence_for_property(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/properties/prop-b1-u101/evidence")
    assert r.status_code == 200
    evs = r.json()
    assert len(evs) > 0
    source_types = {e["source_type"] for e in evs}
    # All 7 required sensor types must be present
    required = {"GIS_PARCEL", "DRONE_IMAGERY", "LIDAR", "FLOOR_PLAN", "GNSS_CORS", "DEM", "DSM"}
    assert required.issubset(source_types), f"Missing: {required - source_types}"

@pytest.mark.asyncio
async def test_evidence_is_marked_synthetic(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/properties/prop-b1-u101/evidence")
    evs = r.json()
    assert all(e["is_synthetic"] is True for e in evs)

# ─────────────────────────────────────────────
# VALIDATION API
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_validation_endpoint_clean_unit(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/properties/prop-b1-u101/validation")
    assert r.status_code == 200
    data = r.json()
    assert data["total_rules_checked"] == 9
    assert "results" in data
    assert data["passed_rules"] + data["warning_rules"] + data["failed_rules"] == 9

@pytest.mark.asyncio
async def test_validation_post_endpoint(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/properties/prop-b1-u101/validate")
    assert r.status_code == 200
    data = r.json()
    assert data["total_rules_checked"] == 9

@pytest.mark.asyncio
async def test_validation_unit302_detects_overlap(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/properties/prop-b1-u302/validation")
    assert r.status_code == 200
    data = r.json()
    failed_rules = [res for res in data["results"] if res["status"] == "FAIL"]
    overlap_rule = next((r for r in failed_rules if r["rule_id"] == "RULE_05"), None)
    assert overlap_rule is not None, "Unit 302 must fail RULE_05 vertical overlap"
    assert data["overall_status"] == "FAIL"

# ─────────────────────────────────────────────
# OFFICER REVIEW & CORRECTION (STATE CHANGE)
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_review_queue_not_empty(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/reviews")
    assert r.status_code == 200
    cases = r.json()
    assert len(cases) >= 1

@pytest.mark.asyncio
async def test_review_get_by_id(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/reviews/case-302-overlap")
    assert r.status_code == 200
    case = r.json()
    assert case["status"] == "CORRECTION_REQUIRED"
    assert case["priority"] == "HIGH"

@pytest.mark.asyncio
async def test_officer_correction_changes_backend_state(app):
    """Critical test: Correction must ACTUALLY change backend state, not just frontend."""
    from app.repositories.data_repository import repository

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/reviews/case-302-overlap/correct", json={
            "z_min_m": 514.0,
            "z_max_m": 517.0,
            "reason": "Officer geometry correction to eliminate vertical overlap with Unit 301"
        })
    assert r.status_code == 200
    corrected = r.json()

    # Verify backend state ACTUALLY changed
    unit_after = repository.units["prop-b1-u302"]
    assert unit_after.z_min_m == 514.0, "Backend z_min_m must change to 514.0"
    assert unit_after.z_max_m == 517.0, "Backend z_max_m must change to 517.0"
    assert unit_after.revision_number == 2, "Revision number must increment"

@pytest.mark.asyncio
async def test_correction_triggers_revalidation_pass(app):
    """After correction, revalidation of unit 302 must PASS RULE_05.
    Correction target: 514.0-517.0m — between floor 3 ceiling (514.0m) and floor 4 floor (517.5m)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # Apply correction (must not collide with floor 4 units at 517.5-521.0m)
        await c.post("/api/reviews/case-302-overlap/correct", json={
            "z_min_m": 514.0,
            "z_max_m": 517.0,
            "reason": "Officer geometry correction"
        })
        # Re-run validation
        r = await c.get("/api/properties/prop-b1-u302/validation")

    data = r.json()
    r5 = next(res for res in data["results"] if res["rule_id"] == "RULE_05")
    assert r5["status"] == "PASS", "Rule 05 must PASS after officer corrects elevation bounds"


@pytest.mark.asyncio
async def test_review_approve_changes_status(app):
    from app.repositories.data_repository import repository
    # First correct the unit so it passes validation
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.post("/api/reviews/case-302-overlap/correct", json={
            "z_min_m": 514.0, "z_max_m": 517.0,
            "reason": "Officer correction"
        })
        r = await c.post("/api/reviews/case-302-overlap/approve", json={
            "reason": "All validation rules passed after geometry correction"
        })
    assert r.status_code == 200
    case = r.json()
    assert case["status"] == "APPROVED"
    # Verify unit status changed in backend
    unit = repository.units["prop-b1-u302"]
    assert unit.verification_status == "APPROVED"

@pytest.mark.asyncio
async def test_review_reject_changes_status(app):
    from app.repositories.data_repository import repository
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/reviews/case-302-overlap/reject", json={
            "reason": "Persistent data conflict, cannot verify"
        })
    assert r.status_code == 200
    assert r.json()["status"] == "REJECTED"

# ─────────────────────────────────────────────
# ISSUE REPORTS
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_create_issue_report(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/reports", json={
            "property_id": "prop-b1-u101",
            "title": "Unit height boundary appears incorrect",
            "description": "The 3rd floor unit seems to overlap visually with the floor above.",
            "contact_email": "test.citizen@example.in",
            "category": "DATA_DISCREPANCY"
        })
    assert r.status_code == 200
    rep = r.json()
    assert rep["status"] == "OPEN"
    assert rep["reporter_type"] == "PUBLIC_USER"
    assert rep["report_code"].startswith("REP-")

@pytest.mark.asyncio
async def test_issue_report_not_for_nonexistent_property(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/reports", json={
            "property_id": "NONEXISTENT",
            "title": "Test", "description": "Test",
            "contact_email": "x@x.in", "category": "DATA_DISCREPANCY"
        })
    assert r.status_code == 404

@pytest.mark.asyncio
async def test_get_reports(app):
    from app.repositories.data_repository import repository
    # Create a report first
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.post("/api/reports", json={
            "property_id": "prop-b1-u101",
            "title": "T", "description": "D",
            "contact_email": "x@x.in", "category": "DATA_DISCREPANCY"
        })
        r = await c.get("/api/reports")
    assert r.status_code == 200
    assert len(r.json()) == 1

# ─────────────────────────────────────────────
# LIDAR
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_lidar_analysis(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/lidar/analyze", json={"property_id": "prop-b1-u101"})
    assert r.status_code == 200
    data = r.json()
    assert data["estimated_height_m"] > 0
    assert data["point_count"] > 0
    assert len(data["floor_heights"]) > 0
    assert "SIMULATED" in data["source_type"]

@pytest.mark.asyncio
async def test_lidar_get_endpoint(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/lidar/prop-b1-u101/lidar-analysis")
    assert r.status_code == 200

# ─────────────────────────────────────────────
# AI ENGINE
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_ai_building_extraction(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/ai/building-extraction", json={"parcel_id": "parcel-urban-001"})
    assert r.status_code == 200
    data = r.json()
    assert data["module"] == "AUTOMATED_BUILDING_EXTRACTION"
    assert data["confidence_score"] > 0
    assert "detected_footprint_2d" in data["extracted_features"]

@pytest.mark.asyncio
async def test_ai_floor_segmentation(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/ai/floor-segmentation", json={"building_id": "bld-urban-001"})
    assert r.status_code == 200
    data = r.json()
    assert data["module"] == "FLOOR_SEGMENTATION"
    assert len(data["extracted_features"]["floor_slices"]) > 0

@pytest.mark.asyncio
async def test_ai_vertical_delineation(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/ai/vertical-delineation", json={"floor_id": "floor-b1-3"})
    assert r.status_code == 200
    data = r.json()
    assert data["module"] == "VERTICAL_PARCEL_DELINEATION"
    assert data["extracted_features"]["proposed_units_count"] >= 1

# ─────────────────────────────────────────────
# SEARCH
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_search_by_parcel_code(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/search?q=P001")
    assert r.status_code == 200
    data = r.json()
    assert data["total_results"] >= 1

@pytest.mark.asyncio
async def test_search_by_building_name(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/search?q=Navkar")
    assert r.status_code == 200
    data = r.json()
    assert data["total_results"] >= 1

@pytest.mark.asyncio
async def test_search_by_locality(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/search?q=Arera")
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_search_no_results(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/search?q=XXXXNONEXISTENT9999")
    assert r.status_code == 200
    assert r.json()["total_results"] == 0

# ─────────────────────────────────────────────
# INFRASTRUCTURE
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_underground_infrastructure_exists(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/infrastructures/underground")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    ug = data[0]
    assert ug["z_min_m"] < ug["z_max_m"]
    assert ug["z_min_m"] < 500.0  # Below ground elevation

@pytest.mark.asyncio
async def test_elevated_infrastructure_exists(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/infrastructures/elevated")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    ev = data[0]
    assert ev["z_min_m"] > 500.0  # Above ground

# ─────────────────────────────────────────────
# SIMULATION SCENARIOS
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_simulation_spatial_error(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/simulation/spatial-error")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "FAIL"

@pytest.mark.asyncio
async def test_simulation_missing_evidence(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/simulation/missing-evidence")
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_simulation_multi_source_conflict(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/simulation/multi-source-conflict")
    assert r.status_code == 200
    data = r.json()
    assert data["discrepancy_m"] == 3.0

@pytest.mark.asyncio
async def test_simulation_rural_structure(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/simulation/rural-structure")
    assert r.status_code == 200
    data = r.json()
    candidates = data["candidates"]
    assert len(candidates) >= 2
    perm = next(c for c in candidates if c["permanence_classification"] == "LIKELY_PERMANENT")
    temp = next(c for c in candidates if c["permanence_classification"] == "LIKELY_TEMPORARY")
    # False positive must have explanation
    assert temp["false_positive_reason"] is not None
    # No illegal house claims
    illegal_terms = ["illegal", "illegal house", "unauthorized dwelling"]
    for c in candidates:
        if c.get("false_positive_reason"):
            for term in illegal_terms:
                assert term.lower() not in c["false_positive_reason"].lower(), \
                    "False positive must not claim illegal construction"

@pytest.mark.asyncio
async def test_simulation_reset(app):
    from app.repositories.data_repository import repository
    # Make a modification
    next(iter(repository.units.values())).z_min_m = 999.0
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/simulation/reset")
    assert r.status_code == 200
    # Verify state actually restored
    unit = next(u for u in repository.units.values() if u.unit_number == "101")
    assert unit.z_min_m != 999.0

# ─────────────────────────────────────────────
# AUDIT
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_audit_log_records_review_action(app):
    from app.repositories.data_repository import repository
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.post("/api/reviews/case-302-overlap/correct", json={
            "z_min_m": 514.0, "z_max_m": 517.5,
            "reason": "Test correction"
        })
    assert len(repository.audit_log) >= 1
    action = repository.audit_log[-1]
    assert action.actor_role == "INSPECTION_OFFICER"

@pytest.mark.asyncio
async def test_revision_recorded_after_correction(app):
    from app.repositories.data_repository import repository
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.post("/api/reviews/case-302-overlap/correct", json={
            "z_min_m": 514.0, "z_max_m": 517.5,
            "reason": "Test revision record"
        })
    assert len(repository.revisions) >= 1
    rev = repository.revisions[-1]
    assert "z_min_m" in rev.changed_fields or "z_max_m" in rev.changed_fields
    assert rev.previous_values != rev.new_values

# ─────────────────────────────────────────────
# SPATIAL ENGINE
# ─────────────────────────────────────────────
def test_spatial_containment_check():
    from app.services.spatial_engine import spatial_engine
    outer = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]
    inner = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8], [0.2, 0.2]]
    contained, pct = spatial_engine.check_containment_2d(inner, outer)
    assert contained is True
    assert pct >= 99.0

def test_spatial_vertical_overlap_detected():
    from app.services.spatial_engine import spatial_engine
    has_overlap, height = spatial_engine.check_vertical_overlap(100.0, 103.0, 102.0, 105.0)
    assert has_overlap is True
    assert abs(height - 1.0) < 0.01

def test_spatial_vertical_overlap_no_false_positive():
    from app.services.spatial_engine import spatial_engine
    has_overlap, _ = spatial_engine.check_vertical_overlap(100.0, 103.0, 103.0, 106.0)
    assert has_overlap is False

def test_spatial_area_calculation():
    from app.services.spatial_engine import spatial_engine
    coords = [[0.0, 0.0], [0.001, 0.0], [0.001, 0.001], [0.0, 0.001], [0.0, 0.0]]
    area = spatial_engine.calculate_area(coords)
    assert area > 0

# ─────────────────────────────────────────────
# PRIVACY & SYNTHETIC DATA INTEGRITY
# ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_synthetic_data_clearly_labelled(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/parcels")
    parcels = r.json()
    assert all(p.get("is_synthetic") is True for p in parcels)

@pytest.mark.asyncio
async def test_health_contains_privacy_statement(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/health")
    assert "privacy" in r.json()
    assert "personal files" in r.json()["privacy"].lower()
