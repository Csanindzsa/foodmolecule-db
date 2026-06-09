# nutrii — Development Guide

---

## Getting Started

### One-Time Setup

```bash
# Clone
git clone https://github.com/Csanindzsa/foodmolecule-db.git nutrii
cd nutrii

# Environment
cp .env.example .env
# Edit: add OPENROUTER_API_KEY, Supabase credentials, USDA_API_KEY, NCBI_API_KEY

# Start infrastructure (Docker)
docker compose up -d

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # optional, for admin

# Start dev servers (in separate terminals)
python manage.py runserver        # Backend: http://localhost:8000

cd web
bun install
bun run dev                       # Frontend: http://localhost:5173
```

---

## Project Architecture

The project is a **monorepo** with separate directories for each major component:

| Directory | Tech | Purpose |
|-----------|------|---------|
| `backend/` | Django 5 + DRF | API server |
| `web/` | React 19 + Vite | Web frontend |
| `mobile/` | Expo (React Native) | Mobile app |
| `ai/` | Python | OpenRouter agent system |
| `scripts/` | Python | Data pipeline + PubMed |
| `infra/` | Docker | Infrastructure |

---

## Development Workflow

### Making Changes

1. **Backend changes:** Python files in `backend/core/`
   - Models: `backend/core/models.py`
   - Views: `backend/core/views.py`
   - Serializers: `backend/core/serializers.py`
   - Run tests: `pytest`

2. **Web changes:** TypeScript in `web/src/`
   - Pages: `web/src/pages/`
   - Components: `web/src/components/`
   - API client: `web/src/lib/api.ts`

3. **Mobile changes:** TypeScript in `mobile/src/`
   - Screens: `mobile/src/screens/`
   - State: `mobile/src/stores/`

4. **AI changes:** Python in `ai/`
   - Agent system: `ai/dispatcher.py`, `ai/consensus_selector.py`
   - Prompts: `ai/prompts/*.j2`

5. **Scripts:** Python in `scripts/`
   - Pipeline: `scripts/run_pipeline.py`
   - Fetchers: `scripts/fetchers/`

---

## Test Commands

```bash
# Backend tests
cd backend
pytest                                    # All tests
pytest core/tests/test_models.py          # Model tests
pytest core/tests/test_health_index.py    # Health index tests

# AI tests
cd ai
python -m pytest tests/                   # Consensus selector, dispatcher, parsers

# Web (if configured)
cd web
bun run test                             # Bun tests
bun run build                            # TypeScript + Vite build
```

---

## Database Migrations

```bash
cd backend

# After model changes:
python manage.py makemigrations

# Apply:
python manage.py migrate

# Check SQL:
python manage.py sqlmigrate core 0001
```

---

## Running the Data Pipeline

```bash
# Dry run (validate only)
python scripts/run_pipeline.py \
  --foods data/seed/foods \
  --molecules data/seed/molecules \
  --dry-run

# Full run (inserts into database)
python scripts/run_pipeline.py \
  --foods data/seed/foods \
  --molecules data/seed/molecules
```

---

## Adding New Seed Data

Create a JSON file in `data/seed/foods/` or `data/seed/molecules/`:

**Food format:**
```json
{
  "name": "kale",
  "aliases": ["brassica oleracea", "borecole"],
  "category": "Leafy Vegetable",
  "origin": "Europe",
  "molecules": [
    {
      "molecule_name": "oxalic acid",
      "amount_per_100g": 20.0,
      "unit": "mg",
      "is_beneficial": false
    }
  ]
}
```

**Molecule format:**
```json
{
  "name": "oxalic acid",
  "pubchem_cid": 971,
  "cas_number": "144-62-7",
  "molecular_formula": "C2H2O4",
  "harm_level": 3,
  "is_heat_stable": true,
  "is_neutralizable": true
}
```

---

## Coding Conventions

### Python
- Type hints on all functions
- Pydantic models for data validation
- Django ORM for database access
- `ruff`/`black`/`mypy` remain planned hardening tools

### TypeScript
- Strict TypeScript configuration
- React functional components with hooks
- Zustand for state management
- TanStack Query for API data fetching (web)

### Commit Messages
Follow conventional commits:
```
feat: add new feature
fix: correct bug
docs: update documentation
refactor: restructure without behavior change
test: add tests
```

## Security Notes

- Never commit `.env` file (it's in `.gitignore`)
- No authentication in API (public by design)
- Rate limiting is enabled in production through DRF anonymous throttles
- CORS allow-list in production
- API keys read from environment only
- Service role key never used in client-side code
