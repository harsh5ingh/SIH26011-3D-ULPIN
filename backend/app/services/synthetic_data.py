from typing import List, Dict, Any
from faker import Faker
import numpy as np
from app.models.entities import (
    Parcel, Building, Floor, PropertyUnit, UndergroundInfrastructure,
    ElevatedInfrastructure, Evidence, EvidenceSourceType, VerificationStatus,
    AreaType, ReviewCase, StructureCandidate, PermanenceClassification
)
from app.services.id_engine import id_engine
from app.services.spatial_engine import spatial_engine
import uuid

fake = Faker("en_IN")
Faker.seed(42)
np.random.seed(42)

class SyntheticDataGenerator:
    """
    Seeded Synthetic Dataset Generator using Faker (metadata) + Shapely (geometry) + Controlled Elevations.
    All data is clearly tagged as SYNTHETIC_DEMO.
    """

    @staticmethod
    def generate_all() -> Dict[str, Any]:
        parcels: List[Parcel] = []
        buildings: List[Building] = []
        floors: List[Floor] = []
        units: List[PropertyUnit] = []
        underground: List[UndergroundInfrastructure] = []
        elevated: List[ElevatedInfrastructure] = []
        evidences: List[Evidence] = []
        review_cases: List[ReviewCase] = []
        structure_candidates: List[StructureCandidate] = []

        # ==========================================
        # 1. URBAN PARCEL 1 (P001 - Multi-Storey Building)
        # ==========================================
        p1_coords = [
            [77.4120, 23.2590],
            [77.4135, 23.2590],
            [77.4135, 23.2605],
            [77.4120, 23.2605],
            [77.4120, 23.2590]
        ]
        p1_area = spatial_engine.calculate_area(p1_coords)
        parcel1 = Parcel(
            id="parcel-urban-001",
            parcel_code="P001",
            state="Madhya Pradesh",
            district="Bhopal",
            locality="Arera Colony",
            village=None,
            area_sqm=p1_area,
            geometry_2d=p1_coords,
            land_use="RESIDENTIAL_COMMERCIAL",
            area_type=AreaType.URBAN,
            status="ACTIVE",
            metadata={"survey_number": "SY-104/A", "zone": "Zone 4", "fSI": 2.5},
            is_synthetic=True
        )
        parcels.append(parcel1)

        # Building A on Parcel 1
        b1_coords = [
            [77.4123, 23.2593],
            [77.4130, 23.2593],
            [77.4130, 23.2600],
            [77.4123, 23.2600],
            [77.4123, 23.2593]
        ]
        bld1 = Building(
            id="bld-urban-001",
            building_code="B01",
            parcel_id=parcel1.id,
            name="Navkar Heights Apartment",
            total_floors=5,
            basement_floors=1,
            footprint_2d=b1_coords,
            ground_elevation_m=500.0,  # AMSL
            total_height_m=18.0,
            structure_type="RCC_FRAME_MULTI_STOREY",
            status="ACTIVE",
            metadata={"completion_year": 2022, "builder": "Navkar Realties", "fire_noc": True}
        )
        buildings.append(bld1)

        # Floors for Building A (Basement -1, Ground 0, Floor 1..4)
        floor_defs = [
            (-1, "Basement Parking", -3.0, 0.0),
            (0, "Ground Floor / Retail", 0.0, 3.5),
            (1, "First Floor", 3.5, 7.0),
            (2, "Second Floor", 7.0, 10.5),
            (3, "Third Floor", 10.5, 14.0),
            (4, "Fourth Floor", 14.0, 17.5)
        ]
        
        bld1_floors = []
        for fn, fname, zm, zmx in floor_defs:
            flr = Floor(
                id=f"floor-b1-{fn}",
                building_id=bld1.id,
                floor_number=fn,
                floor_name=fname,
                z_min_m=500.0 + zm,
                z_max_m=500.0 + zmx,
                height_m=zmx - zm,
                unit_count=2 if fn >= 0 else 1
            )
            floors.append(flr)
            bld1_floors.append(flr)

        # Units for Building A
        # Unit 101, 102, 201, 202, 301, 302, 401, 402
        u1_left = [
            [77.4123, 23.2593], [77.41265, 23.2593],
            [77.41265, 23.2600], [77.4123, 23.2600], [77.4123, 23.2593]
        ]
        u1_right = [
            [77.41265, 23.2593], [77.4130, 23.2593],
            [77.4130, 23.2600], [77.41265, 23.2600], [77.41265, 23.2593]
        ]

        # Standard clean units
        # NOTE: Floor 4 starts at 517.5m so that Unit 302 can be corrected to 514.0-517.0m without collision.
        # DEMO INTENTIONAL ERROR: Unit 302 uses full building footprint (data-entry error) AND wrong Z-range
        # causing 3D volumetric overlap with Unit 301 (different footprint half, same floor).
        # After officer correction (Z: 514.0-517.0m, footprint: u1_right), all overlaps clear.
        unit_configs = [
            ("101", 1, u1_left,  503.5, 507.0, VerificationStatus.APPROVED, 94.2),
            ("102", 1, u1_right, 503.5, 507.0, VerificationStatus.APPROVED, 95.0),
            ("201", 2, u1_left,  507.0, 510.5, VerificationStatus.APPROVED, 92.8),
            ("202", 2, u1_right, 507.0, 510.5, VerificationStatus.APPROVED, 93.5),
            ("301", 3, u1_left,  510.5, 514.0, VerificationStatus.UNDER_REVIEW, 81.5),
            # ERROR: Unit 302 claims full building footprint + wrong Z range (overlaps Unit 301)
            ("302", 3, b1_coords, 512.5, 516.0, VerificationStatus.CORRECTION_REQUIRED, 62.0),
            ("401", 4, u1_left,  517.5, 521.0, VerificationStatus.APPROVED, 91.0),
            ("402", 4, u1_right, 517.5, 521.0, VerificationStatus.APPROVED, 92.0),
        ]

        for unum, fn, ucoords, zm, zmx, vstat, conf in unit_configs:
            f_obj = next(f for f in bld1_floors if f.floor_number == fn)
            proposed_id = id_engine.generate_3d_identifier(
                country="IN", state_code="MP", city_code="BPL",
                parcel_code="P001", building_code="B01",
                floor_code=f"F0{fn}", unit_code=f"U{unum[-2:]}"
            )
            u_area = spatial_engine.calculate_area(ucoords)
            
            punit = PropertyUnit(
                id=f"prop-b1-u{unum}",
                property_code=f"P001-B01-F{fn}-U{unum}",
                parcel_id=parcel1.id,
                building_id=bld1.id,
                floor_id=f_obj.id,
                floor_number=fn,
                unit_number=unum,
                unit_type="RESIDENTIAL",
                z_min_m=zm,
                z_max_m=zmx,
                footprint_2d=ucoords,
                area_sqm=u_area,
                proposed_3d_id=proposed_id,
                verification_status=vstat,
                technical_confidence=conf,
                primary_use="3-BHK Residential Flat",
                revision_number=1,
                under_review_note="Official review in progress" if vstat in (VerificationStatus.UNDER_REVIEW, VerificationStatus.CORRECTION_REQUIRED) else None,
                is_synthetic=True
            )
            units.append(punit)

        # ==========================================
        # 2. UNDERGROUND & ELEVATED INFRASTRUCTURE (P001 & P003)
        # ==========================================
        ug_park = UndergroundInfrastructure(
            id="infra-ug-001",
            parcel_id=parcel1.id,
            infrastructure_code="UG-PARK-01",
            name="Navkar Underground Basement Parking",
            type="BASEMENT_PARKING",
            z_min_m=495.0,  # -5m below ground
            z_max_m=500.0,
            geometry_2d=b1_coords,
            verification_status=VerificationStatus.APPROVED,
            proposed_3d_id="IN-MP-BPL-P001-UG-PARK-01",
            metadata={"capacity_cars": 24, "ventilation": "MECHANICAL"}
        )
        underground.append(ug_park)

        # Elevated Transport Corridor on Parcel 3
        p3_coords = [
            [77.4150, 23.2590], [77.4165, 23.2590],
            [77.4165, 23.2605], [77.4150, 23.2605], [77.4150, 23.2590]
        ]
        parcel3 = Parcel(
            id="parcel-urban-003",
            parcel_code="P003",
            state="Madhya Pradesh",
            district="Bhopal",
            locality="MP Nagar",
            village=None,
            area_sqm=spatial_engine.calculate_area(p3_coords),
            geometry_2d=p3_coords,
            land_use="TRANSPORT_CORRIDOR",
            area_type=AreaType.URBAN,
            status="ACTIVE",
            is_synthetic=True
        )
        parcels.append(parcel3)

        ev_metro = ElevatedInfrastructure(
            id="infra-ev-001",
            parcel_id=parcel3.id,
            infrastructure_code="EV-METRO-01",
            name="Bhopal Metro Elevated Corridor Line 1",
            type="ELEVATED_METRO",
            z_min_m=512.0,  # 12m above ground
            z_max_m=518.0,  # 18m above ground
            geometry_2d=[
                [77.4150, 23.2597], [77.4165, 23.2597],
                [77.4165, 23.2599], [77.4150, 23.2599], [77.4150, 23.2597]
            ],
            verification_status=VerificationStatus.APPROVED,
            proposed_3d_id="IN-MP-BPL-P003-EV-METRO-01",
            metadata={"operator": "MPMRCL", "clearance_m": 8.5}
        )
        elevated.append(ev_metro)

        # ==========================================
        # 3. URBAN PARCEL 2 (P002 - Commercial)
        # ==========================================
        p2_coords = [
            [77.4136, 23.2590], [77.4148, 23.2590],
            [77.4148, 23.2605], [77.4136, 23.2605], [77.4136, 23.2590]
        ]
        parcel2 = Parcel(
            id="parcel-urban-002",
            parcel_code="P002",
            state="Madhya Pradesh",
            district="Bhopal",
            locality="Arera Colony",
            village=None,
            area_sqm=spatial_engine.calculate_area(p2_coords),
            geometry_2d=p2_coords,
            land_use="COMMERCIAL",
            area_type=AreaType.URBAN,
            status="ACTIVE",
            is_synthetic=True
        )
        parcels.append(parcel2)

        b2_coords = [
            [77.4138, 23.2592], [77.4145, 23.2592],
            [77.4145, 23.2602], [77.4138, 23.2602], [77.4138, 23.2592]
        ]
        bld2 = Building(
            id="bld-urban-002",
            building_code="B02",
            parcel_id=parcel2.id,
            name="Vardhman Commercial Complex",
            total_floors=3,
            basement_floors=0,
            footprint_2d=b2_coords,
            ground_elevation_m=500.0,
            total_height_m=12.0,
            structure_type="COMMERCIAL_STEEL_GLASS",
            status="ACTIVE",
            metadata={"completion_year": 2023}
        )
        buildings.append(bld2)

        for fn in range(3):
            flr = Floor(
                id=f"floor-b2-{fn}",
                building_id=bld2.id,
                floor_number=fn,
                floor_name=f"Floor {fn}",
                z_min_m=500.0 + (fn * 4.0),
                z_max_m=500.0 + ((fn + 1) * 4.0),
                height_m=4.0,
                unit_count=1
            )
            floors.append(flr)
            
            proposed_id = id_engine.generate_3d_identifier("IN", "MP", "BPL", "P002", "B02", f"F0{fn}", "U01")
            punit = PropertyUnit(
                id=f"prop-b2-u{fn}01",
                property_code=f"P002-B02-F{fn}-U01",
                parcel_id=parcel2.id,
                building_id=bld2.id,
                floor_id=flr.id,
                floor_number=fn,
                unit_number=f"{fn}01",
                unit_type="COMMERCIAL",
                z_min_m=flr.z_min_m,
                z_max_m=flr.z_max_m,
                footprint_2d=b2_coords,
                area_sqm=spatial_engine.calculate_area(b2_coords),
                proposed_3d_id=proposed_id,
                verification_status=VerificationStatus.APPROVED,
                technical_confidence=96.0,
                primary_use="Commercial Office Space",
                revision_number=1,
                is_synthetic=True
            )
            units.append(punit)

        # ==========================================
        # 4. RURAL PARCELS & SENSOR SCENARIOS (R001, R002, R003)
        # ==========================================
        # Rural Parcel A: Agricultural, no structure
        r1_coords = [[77.1000, 23.1000], [77.1050, 23.1000], [77.1050, 23.1050], [77.1000, 23.1050], [77.1000, 23.1000]]
        p_r1 = Parcel(
            id="parcel-rural-001", parcel_code="R001", state="Madhya Pradesh", district="Sehore",
            locality="Ashta Tehsil", village="Kothri Village", area_sqm=spatial_engine.calculate_area(r1_coords),
            geometry_2d=r1_coords, land_use="AGRICULTURAL", area_type=AreaType.RURAL, is_synthetic=True
        )
        parcels.append(p_r1)

        # Rural Parcel B: Agricultural + Permanent House Structure Candidate
        r2_coords = [[77.1060, 23.1000], [77.1110, 23.1000], [77.1110, 23.1050], [77.1060, 23.1050], [77.1060, 23.1000]]
        p_r2 = Parcel(
            id="parcel-rural-002", parcel_code="R002", state="Madhya Pradesh", district="Sehore",
            locality="Ashta Tehsil", village="Kothri Village", area_sqm=spatial_engine.calculate_area(r2_coords),
            geometry_2d=r2_coords, land_use="AGRICULTURAL_RESIDENTIAL", area_type=AreaType.RURAL, is_synthetic=True
        )
        parcels.append(p_r2)

        cand_perm = StructureCandidate(
            id="cand-rur-001",
            parcel_id=p_r2.id,
            detection_source="SYNTHETIC_RURAL_LIDAR",
            location_2d=[77.1080, 23.1025],
            estimated_height_m=4.2,
            permanence_classification=PermanenceClassification.LIKELY_PERMANENT,
            false_positive_reason=None,
            status="PENDING_OFFICER_REVIEW"
        )
        structure_candidates.append(cand_perm)

        # Rural Parcel C: Agricultural + Temporary Brick Stack False Positive
        r3_coords = [[77.1120, 23.1000], [77.1170, 23.1000], [77.1170, 23.1050], [77.1120, 23.1050], [77.1120, 23.1000]]
        p_r3 = Parcel(
            id="parcel-rural-003", parcel_code="R003", state="Madhya Pradesh", district="Sehore",
            locality="Ashta Tehsil", village="Kothri Village", area_sqm=spatial_engine.calculate_area(r3_coords),
            geometry_2d=r3_coords, land_use="AGRICULTURAL", area_type=AreaType.RURAL, is_synthetic=True
        )
        parcels.append(p_r3)

        cand_temp = StructureCandidate(
            id="cand-rur-002",
            parcel_id=p_r3.id,
            detection_source="SYNTHETIC_RURAL_LIDAR",
            location_2d=[77.1140, 23.1020],
            estimated_height_m=1.8,
            permanence_classification=PermanenceClassification.LIKELY_TEMPORARY,
            false_positive_reason="Spatial signature matches temporary agricultural brick stack / construction materials.",
            status="REJECTED_AUTOMATICALLY_NON_PERMANENT"
        )
        structure_candidates.append(cand_temp)

        # ==========================================
        # 5. ATTACH MULTI-SENSOR EVIDENCE (11 TYPES)
        # ==========================================
        for u in units:
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=u.id, object_type="PropertyUnit",
                source_type=EvidenceSourceType.GIS_PARCEL, source_reference="DoLR GIS Cadastral Layer 2024",
                acquisition_date="2024-01-15", processing_method="VECTOR_DIGITIZATION", quality_score=98.0,
                status="VERIFIED", is_synthetic=True
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=u.id, object_type="PropertyUnit",
                source_type=EvidenceSourceType.DRONE_IMAGERY, source_reference="High-Res Drone Orthomosaic Flight #DR-402",
                acquisition_date="2024-02-10", processing_method="PHOTOGRAMMETRY", quality_score=95.0,
                status="VERIFIED", is_synthetic=True
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=u.id, object_type="PropertyUnit",
                source_type=EvidenceSourceType.LIDAR, source_reference="Aerial LiDAR Cloud #LD-992",
                acquisition_date="2024-02-12", processing_method="POINT_CLOUD_HEIGHT_EXTRACTION", quality_score=94.0,
                status="VERIFIED", is_synthetic=True,
                metadata={"estimated_building_height_m": 18.0 if u.building_id == bld1.id else 12.0}
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=u.id, object_type="PropertyUnit",
                source_type=EvidenceSourceType.FLOOR_PLAN, source_reference="Approved Architectural CAD Floor Plan Rev 3",
                acquisition_date="2022-06-20", processing_method="VECTOR_CAD_IMPORT", quality_score=92.0,
                status="VERIFIED", is_synthetic=True,
                metadata={"estimated_building_height_m": 18.0 if u.building_id == bld1.id else 12.0}
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=u.id, object_type="PropertyUnit",
                source_type=EvidenceSourceType.GNSS_CORS, source_reference="Survey of India CORS Network Station BHOP-01",
                acquisition_date="2024-03-01", processing_method="RTK_GNSS_FIX", quality_score=99.0,
                status="VERIFIED", is_synthetic=True,
                metadata={"station_id": "BHOP-01", "accuracy_cm": 1.2}
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=u.id, object_type="PropertyUnit",
                source_type=EvidenceSourceType.DEM, source_reference="National Elevation Model DEM 1m",
                acquisition_date="2023-11-00", processing_method="RASTER_SURFACE_INTERPOLATION", quality_score=90.0,
                status="VERIFIED", is_synthetic=True
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=u.id, object_type="PropertyUnit",
                source_type=EvidenceSourceType.DSM, source_reference="Surface Elevation Model DSM 0.5m",
                acquisition_date="2024-02-10", processing_method="RASTER_SURFACE_EXTRACTION", quality_score=91.0,
                status="VERIFIED", is_synthetic=True
            ))

        # Attach spatial evidence directly to Parcels
        for p in parcels:
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=p.id, object_type="Parcel",
                source_type=EvidenceSourceType.GIS_PARCEL, source_reference=f"DoLR State Cadastral Boundary Layer ({p.parcel_code})",
                acquisition_date="2024-01-10", processing_method="VECTOR_SURVEY_POLYGON", quality_score=98.0,
                status="VERIFIED", is_synthetic=True
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=p.id, object_type="Parcel",
                source_type=EvidenceSourceType.DRONE_IMAGERY, source_reference=f"High-Res Aerial Orthomosaic 5cm ({p.parcel_code})",
                acquisition_date="2024-02-05", processing_method="PHOTOGRAMMETRY", quality_score=96.0,
                status="VERIFIED", is_synthetic=True
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=p.id, object_type="Parcel",
                source_type=EvidenceSourceType.DEM, source_reference=f"Survey of India Ground DEM 1m ({p.locality})",
                acquisition_date="2023-11-15", processing_method="RASTER_TERRAIN_SURFACE", quality_score=93.0,
                status="VERIFIED", is_synthetic=True
            ))

        # Attach evidence to Infrastructures
        for inf in underground + elevated:
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=inf.id, object_type="Infrastructure",
                source_type=EvidenceSourceType.GIS_PARCEL, source_reference=f"Volumetric Right-of-Way Survey ({inf.infrastructure_code})",
                acquisition_date="2024-01-20", processing_method="VOLUMETRIC_CADASTRE_ALIGNMENT", quality_score=97.0,
                status="VERIFIED", is_synthetic=True
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=inf.id, object_type="Infrastructure",
                source_type=EvidenceSourceType.LIDAR, source_reference=f"LiDAR 3D Profile ({inf.name})",
                acquisition_date="2024-02-18", processing_method="POINT_CLOUD_CROSS_SECTION", quality_score=95.0,
                status="VERIFIED", is_synthetic=True,
                metadata={"z_min_m": inf.z_min_m, "z_max_m": inf.z_max_m}
            ))

        # Attach evidence to Rural Structure Candidates
        for cand in structure_candidates:
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=cand.id, object_type="StructureCandidate",
                source_type=EvidenceSourceType.LIDAR, source_reference=f"Rural LiDAR Point-Cloud Scan #{cand.id}",
                acquisition_date="2024-03-05", processing_method="SURFACE_ANOMALY_DETECTION", quality_score=92.0,
                status="DETECTED", is_synthetic=True,
                metadata={"estimated_height_m": cand.estimated_height_m, "permanence": cand.permanence_classification}
            ))
            evidences.append(Evidence(
                id=str(uuid.uuid4()), object_id=cand.id, object_type="StructureCandidate",
                source_type=EvidenceSourceType.DRONE_IMAGERY, source_reference="Village Aerial Reconnaissance Orthophoto",
                acquisition_date="2024-03-06", processing_method="UAV_SURFACE_INSPECTION", quality_score=90.0,
                status="DETECTED", is_synthetic=True
            ))

        # Add Review Case for Unit 302 (Demo vertical overlap case)
        target_unit_302 = next(u for u in units if u.unit_number == "302")
        review_case_302 = ReviewCase(
            id="case-302-overlap",
            property_id=target_unit_302.id,
            case_number="RC-2026-0042",
            status=VerificationStatus.CORRECTION_REQUIRED,
            priority="HIGH",
            assigned_officer="Inspection Officer R. K. Sharma",
            created_at="2026-09-01T10:00:00Z",
            updated_at="2026-09-01T10:00:00Z",
            review_notes="Automated topology check detected vertical 3D elevation overlap with Unit 301. Officer geometry adjustment required.",
            history=[
                {"timestamp": "2026-09-01T10:00:00Z", "from_status": "PENDING_VERIFICATION", "to_status": "CORRECTION_REQUIRED", "officer": "SYSTEM_VALIDATOR", "notes": "Rule 05 Vertical Overlap Failed"}
            ]
        )
        review_cases.append(review_case_302)

        return {
            "parcels": parcels,
            "buildings": buildings,
            "floors": floors,
            "units": units,
            "underground": underground,
            "elevated": elevated,
            "evidences": evidences,
            "review_cases": review_cases,
            "structure_candidates": structure_candidates
        }
