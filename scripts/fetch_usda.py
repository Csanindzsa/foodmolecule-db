"""
Compatibility wrapper for the active USDA FoodData Central fetcher.

The pipeline-compatible implementation lives in scripts.fetchers.fetch_usda.
Keep this top-level entrypoint so older runbooks keep working without emitting
legacy draft JSON.
"""

from scripts.fetchers.fetch_usda import main


if __name__ == "__main__":
    main()
