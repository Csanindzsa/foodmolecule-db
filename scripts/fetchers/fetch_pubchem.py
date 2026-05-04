"""
nutrii — PubChem Fetcher

Fetches molecular properties from PubChem PUG-REST by compound name or CID.
Outputs pipeline-compatible MoleculeEntry JSON.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import httpx

from scripts.pipeline.config import MAX_RETRIES, PUBCHEM_API_BASE, RATE_LIMITS
from scripts.pipeline.models import MoleculeEntry


def get_cid_by_name(name: str) -> int | None:
    """Resolve compound name to PubChem CID."""
    url = f"{PUBCHEM_API_BASE}/compound/name/{name}/cids/JSON"
    with httpx.Client() as client:
        for attempt in range(MAX_RETRIES):
            resp = client.get(url, timeout=30)
            if resp.status_code == 404:
                return None
            if resp.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            cids = resp.json().get("IdentifierList", {}).get("CID", [])
            return cids[0] if cids else None
    return None


def get_compound_properties(cid: int) -> dict:
    """Fetch key properties for a compound by CID."""
    props = "MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES"
    url = f"{PUBCHEM_API_BASE}/compound/cid/{cid}/property/{props}/JSON"
    with httpx.Client() as client:
        resp = client.get(url, timeout=30)
        resp.raise_for_status()
        props_list = resp.json().get("PropertyTable", {}).get("Properties", [])
        return props_list[0] if props_list else {}


def fetch_molecule(name: str, cid: int | None = None) -> MoleculeEntry | None:
    """Fetch and build a MoleculeEntry from PubChem."""
    resolved_cid = cid or get_cid_by_name(name)
    if not resolved_cid:
        return None

    props = get_compound_properties(resolved_cid)
    weight = props.get("MolecularWeight")

    return MoleculeEntry(
        pubchem_cid=resolved_cid,
        name=name,
        iupac_name=props.get("IUPACName", ""),
        cas_number="",  # PubChem does not reliably provide CAS
        molecular_formula=props.get("MolecularFormula", ""),
        molecular_weight=float(weight) if weight else None,
        metadata={
            "canonical_smiles": props.get("CanonicalSMILES", ""),
            "source": "PubChem PUG-REST",
            "ingested_at": None,  # filled by loader
        },
    )


def main():
    parser = argparse.ArgumentParser(description="Fetch molecular data from PubChem")
    parser.add_argument("--compound", required=True, help="Compound name")
    parser.add_argument("--cid", type=int, help="PubChem CID (skip name lookup)")
    parser.add_argument("--output", type=Path, default=Path("data/seed/molecules"), help="Output directory")
    args = parser.parse_args()

    entry = fetch_molecule(args.compound, args.cid)
    if not entry:
        print(f"Could not resolve CID for '{args.compound}'")
        return

    output_path = args.output / f"{entry.name.replace(' ', '_')}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(entry.model_dump(mode="json"), f, indent=2)

    print(f"Molecule entry saved to: {output_path}")


if __name__ == "__main__":
    main()
