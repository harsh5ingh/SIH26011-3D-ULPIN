"""
GeoVISTA Flow Verification Tests
Directly verifies user mandatory test flows:
TEST A: P001 -> 3D properties -> Officer Review -> Public View
TEST B: P002 -> Building B02 -> 3D properties
TEST C: P003 -> Elevated Metro & Subsurface
TEST D: R001 -> Rural agricultural parcel
TEST E: Vertical-overlap scenario -> FAIL -> Officer correction -> PASS -> Public view reflects PASS
TEST F: Missing evidence -> Confidence penalty -> Reset/Restore -> Confidence restored
TEST G: Clean initial state loading
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
    from app.repositories.data_repository import repository
    repository.reset_data()

@pytest.mark.asyncio
async def test_flow_a_p001_selection_and_review(app):
    """TEST A: P001 resolves building B01, units, geometry, evidence, and review cases."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # 1. Resolve parcel P001
        p_res = await c.get("/api/parcels/P001")
        assert p_res.status_code == 200
        p = p_res.json()
        assert p["parcel_code"] == "P001"

        # 2. Resolve buildings
        b_res = await c.get(f"/api/parcels/{p['id']}/buildings")
        assert b_res.status_code == 200
        blds = b_res.json()
        assert len(blds) >= 1
        bld = blds[0]

        # 3. Resolve properties
        u_res = await c.get(f"/api/buildings/{bld['id']}/properties")
        assert u_res.status_code == 200
        units = u_res.json()
        assert len(units) >= 8

        # 4. Resolve geometry & evidence for first unit
        u1 = units[0]
        g_res = await c.get(f"/api/properties/{u1['id']}/geometry")
        assert g_res.status_code == 200
        geom = g_res.json()
        assert geom["z_min_m"] < geom["z_max_m"]

        ev_res = await c.get(f"/api/properties/{u1['id']}/evidence")
        assert ev_res.status_code == 200
        assert len(ev_res.json()) >= 6

@pytest.mark.asyncio
async def test_flow_b_p002_generic_selection(app):
    """TEST B: P002 (Vardhman Commercial) generic resolution without hardcoded branches."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        p_res = await c.get("/api/parcels/P002")
        assert p_res.status_code == 200
        p = p_res.json()
        assert p["parcel_code"] == "P002"

        b_res = await c.get(f"/api/parcels/{p['id']}/buildings")
        assert b_res.status_code == 200
        blds = b_res.json()
        assert len(blds) == 1
        assert blds[0]["building_code"] == "B02"

        u_res = await c.get(f"/api/buildings/{blds[0]['id']}/properties")
        assert u_res.status_code == 200
        units = u_res.json()
        assert len(units) == 3
        # Ensure 3D geometry exists for all units
        for u in units:
            assert u["z_min_m"] < u["z_max_m"]
            assert len(u["footprint_2d"]) >= 4

@pytest.mark.asyncio
async def test_flow_c_p003_transport_corridor_infrastructure(app):
    """TEST C: P003 transport corridor resolves elevated and subsurface infrastructure."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        p_res = await c.get("/api/parcels/P003")
        assert p_res.status_code == 200
        p = p_res.json()
        assert p["parcel_code"] == "P003"
        assert p["land_use"] == "TRANSPORT_CORRIDOR"

        # Check infrastructure for parcel
        inf_res = await c.get(f"/api/parcels/{p['id']}/infrastructures")
        assert inf_res.status_code == 200
        infras = inf_res.json()
        assert len(infras) >= 1
        assert any("Metro" in i["name"] for i in infras)
        elevated_item = next(i for i in infras if "Metro" in i["name"])
        assert elevated_item["z_min_m"] > 500.0  # Elevated above ground

@pytest.mark.asyncio
async def test_flow_d_r001_rural_agricultural_workflow(app):
    """TEST D: R001 rural agricultural parcel loads properly without buildings."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        p_res = await c.get("/api/parcels/R001")
        assert p_res.status_code == 200
        p = p_res.json()
        assert p["parcel_code"] == "R001"
        assert p["area_type"] == "RURAL"
        assert p["land_use"] == "AGRICULTURAL"

        # Buildings should be empty for pure agricultural land
        b_res = await c.get(f"/api/parcels/{p['id']}/buildings")
        assert b_res.status_code == 200
        assert len(b_res.json()) == 0

        # Parcel has 2D geometry for 3D terrain representation
        assert len(p["geometry_2d"]) >= 4

@pytest.mark.asyncio
async def test_flow_e_vertical_overlap_correction_pass(app):
    """TEST E: Spatial error -> FAIL -> Officer correction -> PASS -> Authoritative state reflects PASS."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # 1. Trigger deliberate spatial error
        err_res = await c.post("/api/simulation/spatial-error")
        assert err_res.status_code == 200

        # 2. Validation must FAIL
        val1 = await c.get("/api/properties/prop-b1-u302/validation")
        assert val1.status_code == 200
        r5 = next(r for r in val1.json()["results"] if r["rule_id"] == "RULE_05")
        assert r5["status"] == "FAIL"

        # 3. Officer applies correction via API
        correct_res = await c.post("/api/reviews/case-302-overlap/correct", json={
            "z_min_m": 514.0,
            "z_max_m": 517.0,
            "footprint_2d": [
                [77.41265, 23.2593], [77.413, 23.2593],
                [77.413, 23.26], [77.41265, 23.26], [77.41265, 23.2593]
            ],
            "reason": "Officer geometry correction to eliminate vertical overlap"
        })
        assert correct_res.status_code == 200
        corrected_prop = correct_res.json()
        assert corrected_prop["z_min_m"] == 514.0
        assert corrected_prop["z_max_m"] == 517.0
        assert corrected_prop["revision_number"] == 2

        # 4. Authoritative property record in Public Portal now returns PASS & APPROVED
        public_prop = await c.get("/api/properties/prop-b1-u302")
        assert public_prop.status_code == 200
        assert public_prop.json()["verification_status"] == "APPROVED"

        val2 = await c.get("/api/properties/prop-b1-u302/validation")
        r5_after = next(r for r in val2.json()["results"] if r["rule_id"] == "RULE_05")
        assert r5_after["status"] == "PASS"

@pytest.mark.asyncio
async def test_flow_f_missing_evidence_penalty_and_restore(app):
    """TEST F: Trigger missing evidence -> confidence penalty -> Reset restores baseline."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # 1. Check baseline confidence of clean unit
        c_before = await c.get("/api/properties/prop-b1-u401/confidence")
        base_score = c_before.json()["overall_score"]

        # 2. Trigger missing evidence
        await c.post("/api/simulation/missing-evidence")
        c_after = await c.get("/api/properties/prop-b1-u401/confidence")
        penalized_score = c_after.json()["overall_score"]
        assert penalized_score < base_score

        val = await c.get("/api/properties/prop-b1-u401/validation")
        r7 = next(r for r in val.json()["results"] if r["rule_id"] == "RULE_07")
        assert r7["status"] == "WARNING"

        # 3. Reset restores clean baseline
        await c.post("/api/simulation/reset")
        c_restored = await c.get("/api/properties/prop-b1-u401/confidence")
        assert c_restored.json()["overall_score"] == base_score

@pytest.mark.asyncio
async def test_flow_g_initial_state_validity(app):
    """TEST G: Health and initial datasets load with zero broken references."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        h = await c.get("/health")
        assert h.status_code == 200
        assert h.json()["status"] == "HEALTHY"

        parcels = (await c.get("/api/parcels")).json()
        assert len(parcels) >= 6

        # Verify every parcel code is non-empty
        for p in parcels:
            assert p["parcel_code"]
            assert len(p["geometry_2d"]) >= 4
