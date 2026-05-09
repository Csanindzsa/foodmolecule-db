"""
fetch_pubchem.py
Fetches molecular properties from PubChem by compound name or CID.
Docs: https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest

Requirements: pip install httpx
Usage: python scripts/fetch_pubchem.py --compound "oxalic acid" --output data/molecules/
"""

import httpx
import json
import argparse
from pathlib import Path

BASE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"


def get_cid_by_name(name: str) -> int | None:
    """Resolve compound name to PubChem CID."""
    url = f"{BASE_URL}/compound/name/{name}/cids/JSON"
    with httpx.Client() as client:
        resp = client.get(url, timeout=10)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        cids = resp.json().get("IdentifierList", {}).get("CID", [])
        return cids[0] if cids else None


def get_compound_properties(cid: int) -> dict:
    """Fetch key properties for a compound by CID."""
    props = "MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES"
    url = f"{BASE_URL}/compound/cid/{cid}/property/{props}/JSON"
    with httpx.Client() as client:
        resp = client.get(url, timeout=10)
        resp.raise_for_status()
        props_list = resp.json().get("PropertyTable", {}).get("Properties", [])
        return props_list[0] if props_list else {}


def main():
    parser = argparse.ArgumentParser(description="Fetch molecular data from PubChem")
    parser.add_argument("--compound", required=True, help="Compound name")
    parser.add_argument("--cid", type=int, help="PubChem CID (skip name lookup)")
    parser.add_argument("--output", default="data/molecules/", help="Output directory")
    args = parser.parse_args()

    cid = args.cid or get_cid_by_name(args.compound)
    if not cid:
        print(f"Could not resolve CID for '{args.compound}'")
        return

    props = get_compound_properties(cid)
    print(f"CID: {cid} | Formula: {props.get('MolecularFormula')} | Weight: {props.get('MolecularWeight')}")

    molecule_entry = {
        "pubchem_cid": cid,
        "name": args.compound,
        "iupac_name": props.get("IUPACName", ""),
        "cas_number": "TBD",
        "molecular_formula": props.get("MolecularFormula", ""),
        "molecular_weight": float(props.get("MolecularWeight", 0)),
        "harm_level": "none",  # MUST be manually reviewed
        "harm_mechanisms": [],
        "threshold_concern_mg_per_day": None,
        "neutralization": {},
        "foods_high_in_this": [],
        "references": []
    }

    output_path = Path(args.output) / f"{args.compound.lower().replace(' ', '_')}_draft.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(molecule_entry, f, indent=2)

    print(f"Draft molecule entry saved to: {output_path}")
    print("⚠️  Harm level is set to 'none' by default — manual classification REQUIRED.")


if __name__ == "__main__":
    main()
