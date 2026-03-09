"""
list_spaces.py — Read an IFC file and print all spaces with their names and areas.

Usage:
    python list_spaces.py <path_to_file.ifc>

Requirements:
    pip install ifcopenshell
"""

import sys
import ifcopenshell
import ifcopenshell.util.element as ifc_element


def get_area(space) -> float | None:
    """Return the area of a space from its quantity sets, or None if not found."""
    for rel in getattr(space, "IsDefinedBy", []):
        if rel.is_a("IfcRelDefinesByProperties"):
            props = rel.RelatingPropertyDefinition
            if props.is_a("IfcElementQuantity"):
                for q in props.Quantities:
                    if q.is_a("IfcQuantityArea") and "Area" in q.Name:
                        return q.AreaValue
    return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python list_spaces.py <path_to_file.ifc>")
        sys.exit(1)

    ifc_path = sys.argv[1]
    model = ifcopenshell.open(ifc_path)

    spaces = model.by_type("IfcSpace")

    if not spaces:
        print("No spaces found in file.")
        return

    print(f"{'Name':<40} {'Long Name':<40} {'Area (m²)':>10}")
    print("-" * 92)

    for space in sorted(spaces, key=lambda s: s.Name or ""):
        name = space.Name or "(unnamed)"
        long_name = space.LongName or ""
        area = get_area(space)
        area_str = f"{area:.2f}" if area is not None else "N/A"
        print(f"{name:<40} {long_name:<40} {area_str:>10}")


if __name__ == "__main__":
    main()
