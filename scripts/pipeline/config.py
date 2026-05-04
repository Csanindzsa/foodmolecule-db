"""
Pipeline configuration for nutrii data ingestion.

Centralizes API keys, rate limits, and source configs.
Reads from environment variables (via .env at project root).
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# ─── API Keys ───────────────────────────────────────────────────────────────
USDA_API_KEY = os.getenv("USDA_API_KEY", "DEMO_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
NCBI_API_KEY = os.getenv("NCBI_API_KEY", "")
NCBI_EMAIL = os.getenv("NCBI_EMAIL", "dev@nutrii.app")

# ─── Rate Limits ────────────────────────────────────────────────────────────
# Requests per second per source
RATE_LIMITS = {
    "usda": 10,
    "pubchem": 5,
    "pubmed": 3,
    "chembl": 3,
    "openrouter": 1,
}

# ─── Endpoints ──────────────────────────────────────────────────────────────
USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1"
PUBCHEM_API_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
PUBMED_EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
CHEMBL_API_BASE = "https://www.ebi.ac.uk/chembl/api/data"
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

# ─── Paths ──────────────────────────────────────────────────────────────────
SEED_DIR = PROJECT_ROOT / "data" / "seed"
SEED_DIR.mkdir(parents=True, exist_ok=True)

FOODS_SEED_DIR = SEED_DIR / "foods"
MOLECULES_SEED_DIR = SEED_DIR / "molecules"
FOODS_SEED_DIR.mkdir(exist_ok=True)
MOLECULES_SEED_DIR.mkdir(exist_ok=True)

SCHEMA_DIR = PROJECT_ROOT / "schema"

# ─── Pipeline Settings ──────────────────────────────────────────────────────
BATCH_SIZE = 50  # Number of records to validate/insert in one batch
DEFAULT_TIMEOUT = 30  # HTTP request timeout in seconds
MAX_RETRIES = 3
