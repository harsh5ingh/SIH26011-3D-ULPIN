from typing import Dict, Any, Optional

class IDEngine:
    """
    3D Spatial Identifier Engine for Volumetric Cadastre.
    Produces prototype 3D ULPIN identifiers matching scheme:
    [Country]-[State]-[Locality/City]-[Parcel]-[Building]-[Floor]-[Unit/Infra]
    Example: IN-MP-BPL-P001-B01-F03-U02
    """

    PROTOTYPE_DISCLAIMER = (
        "Proposed 3D Spatial Identifier — Prototype. "
        "This identifier is generated for prototype spatial demonstration purposes only "
        "and does not represent an official Government of India ULPIN or legal land registration title."
    )

    @staticmethod
    def generate_3d_identifier(
        country: str = "IN",
        state_code: str = "MP",
        city_code: str = "BPL",
        parcel_code: str = "P001",
        building_code: Optional[str] = "B01",
        floor_code: Optional[str] = "F03",
        unit_code: Optional[str] = "U02",
        infrastructure_type: Optional[str] = None
    ) -> str:
        """Construct structured 3D spatial identifier string."""
        parts = [country.upper(), state_code.upper(), city_code.upper(), parcel_code.upper()]
        
        if building_code:
            parts.append(building_code.upper())
            
        if floor_code:
            parts.append(floor_code.upper())
            
        if unit_code:
            parts.append(unit_code.upper())
        elif infrastructure_type:
            parts.append(infrastructure_type.upper())

        return "-".join(parts)

    @staticmethod
    def parse_3d_identifier(identifier: str) -> Dict[str, Any]:
        """Parse structured 3D spatial identifier into component parts."""
        parts = identifier.split("-")
        result = {
            "raw": identifier,
            "country": parts[0] if len(parts) > 0 else None,
            "state_code": parts[1] if len(parts) > 1 else None,
            "city_code": parts[2] if len(parts) > 2 else None,
            "parcel_code": parts[3] if len(parts) > 3 else None,
            "building_code": parts[4] if len(parts) > 4 else None,
            "floor_code": parts[5] if len(parts) > 5 else None,
            "unit_code": parts[6] if len(parts) > 6 else None,
            "is_valid_format": len(parts) >= 4,
            "disclaimer": IDEngine.PROTOTYPE_DISCLAIMER
        }
        return result

id_engine = IDEngine()
