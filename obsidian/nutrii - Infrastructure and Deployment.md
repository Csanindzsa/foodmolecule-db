# nutrii — Infrastructure & Deployment

> **Phase 1 Deliverable**

---

## Local Development Environment

### Prerequisites
- Docker & Docker Compose (optional for offline PostgreSQL)
- Python 3.11+
- Bun
- Supabase account (for production database)

### Quick Start

```bash
# Clone and enter
git clone https://github.com/Csanindzsa/foodmolecule-db.git nutrii
cd nutrii

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start optional local PostgreSQL infrastructure
docker compose up -d

# Set up Django backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Start web frontend (separate terminal)
cd web
bun install
bun run dev
```

---

## Docker Services

From `infra/docker-compose.yml`:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `db` | postgres:16-alpine | 5432 | PostgreSQL database |

### Docker Compose Commands

```bash
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose down -v            # Stop + destroy volumes (full reset)
docker compose logs -f db         # Follow database logs
```

---

## Supabase Configuration

File: `infra/supabase-config.md`

### Database Roles

| Role | Permissions | Used By |
|------|-------------|---------|
| `anon` | Public read-only on all published tables | Web + mobile apps |
| `service_role` | Full access (backend-only) | Django backend, AI agents |

### Storage Buckets

| Bucket | Visibility | Purpose |
|--------|------------|---------|
| `food-images` | Public + CDN | Food photographs |
| `molecule-structures` | Public | SVG/PNG molecular diagrams |
| `study-attachments` | Private (backend only) | PDFs linked to PubMed entries |

### Connection Pooling

PgBouncer is enabled on Supabase for serverless workloads.
Direct connection (for migrations): bypasses pooler via `DATABASE_URL_DIRECT`.

---

## Environment Variables

Key variables from `.env.example`:

| Variable | Purpose | Required |
|----------|---------|----------|
| `DJANGO_SECRET_KEY` | Django encryption key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `OPENROUTER_API_KEY` | AI model access | For AI features |
| `CORS_ALLOWED_ORIGINS` | Frontend domains | Yes |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | Production anonymous throttle | Production |
| `USDA_API_KEY` | USDA FoodData Central | For data pipeline |
| `NCBI_API_KEY` | PubMed E-utilities | For PubMed pipeline |

---

## Deployment

### Backend (Render)

Defined in `render.yaml`:
- Django app with Gunicorn
- PostgreSQL via Supabase (not Render's managed DB)
- Local-memory cache by default; add Redis or another shared cache before multi-instance traffic

### Frontend (Vercel)

- React SPA deployed to Vercel
- `VITE_API_URL` points to production backend
- SPA routing via rewrites

### Scaling Roadmap

| Users | Infrastructure |
|-------|---------------|
| 0-10k | Supabase free tier + Vercel hobby |
| 10k-100k | Supabase Pro + Vercel Pro + shared cache |
| 100k-1M | Supabase Enterprise + CDN + read replicas |
| 1M+ | Self-managed PG + dedicated OCR cluster |
