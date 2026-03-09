# ifc-reader

A quick boilerplate test case built with Claude Code to learn how to use it.

## What it does

`read_ifc_spaces.py` reads an [IFC](https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/) file and prints a formatted table of all spaces (rooms) found in the model, including their name, long name, and floor area.

It uses [ifcopenshell](https://ifcopenshell.org/) to parse the IFC file, iterates over all `IfcSpace` elements, and extracts area values from quantity sets (`IfcElementQuantity` / `IfcQuantityArea`).

## Usage

```bash
python read_ifc_spaces.py <path_to_file.ifc>
```

Example output:

```
Name                                     Long Name                                  Area (m²)
--------------------------------------------------------------------------------------------
Living Room                              Ground Floor Living Room                      25.40
Kitchen                                  Ground Floor Kitchen                          12.80
...
```

## Requirements

```bash
pip install ifcopenshell
```
