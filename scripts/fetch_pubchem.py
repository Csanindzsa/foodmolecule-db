"""
Compatibility wrapper for the active PubChem fetcher.

The pipeline-compatible implementation lives in scripts.fetchers.fetch_pubchem.
Keep this top-level entrypoint so older runbooks keep working without emitting
legacy draft JSON.
"""

from scripts.fetchers.fetch_pubchem import main


if __name__ == "__main__":
    main()
