from scripts import fetch_pubchem, fetch_usda
from scripts.fetchers import fetch_pubchem as active_pubchem
from scripts.fetchers import fetch_usda as active_usda


def test_top_level_usda_fetcher_delegates_to_pipeline_fetcher():
    assert fetch_usda.main is active_usda.main


def test_top_level_pubchem_fetcher_delegates_to_pipeline_fetcher():
    assert fetch_pubchem.main is active_pubchem.main
