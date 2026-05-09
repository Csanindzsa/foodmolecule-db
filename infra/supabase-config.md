# Supabase Configuration Guide

> **Phase 1 Deliverable**  
> This project uses **Supabase** as the single source of truth for both local development and production. No Docker required.

---

## 1. Create the Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. **Project name:** `nutrii-db`
3. **Region:** Choose closest to your primary user base (e.g., `eu-central-1` for Europe).
4. **Database password:** Generate a strong password and store it. You will need it for the connection string.

---

## 2. Database Roles

Supabase creates these roles automatically:

| Role | Purpose |
|------|---------|
| `anon` | Public read-only access to published tables |
| `authenticated` | Not used in this project (no auth) |
| `service_role` | Backend-only full access for data ingestion and AI agents |

Verify:
```sql
SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'service_role');
```

---

## 3. Connection Pooling (PgBouncer)

In Supabase dashboard → **Settings → Database → Connection Pooling**:

- **Mode:** Transaction
- **Pool Size:** 15 (free tier) or 25+ (Pro)

Use these connection strings in your `.env`:

```
# Pooler (for Django app runtime):
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Direct (for Django migrations only):
postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
```

---

## 4. Storage Buckets

Create these buckets in **Supabase Dashboard → Storage**:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `food-images` | ✅ | Food ingredient photos |
| `molecule-structures` | ✅ | SVG/PNG molecular diagrams |
| `study-attachments` | ❌ | Optional PDFs linked to PubMed |

---

## 5. Local Development (No Docker Required)

Since this project has **no other contributors**, the simplest setup is:

1. Create your Supabase project (free tier is fine)
2. Copy the **pooler connection string** into your `.env` as `DATABASE_URL`
3. Run Django locally — it connects directly to Supabase

```bash
cd backend
python manage.py migrate        # runs migrations on Supabase
python manage.py runserver      # local dev server, Supabase backend
```

**That's it.** No Docker, no local PostgreSQL, no Redis, no MinIO.

---

## 6. Environment Variables

After provisioning, fill these into your `.env`:

```
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=[anon public key]
SUPABASE_SERVICE_ROLE_KEY=[service role key — NEVER expose client-side]
SUPABASE_DB_PASSWORD=[database password set during project creation]
```

`DATABASE_URL` is optional — if not set, Django auto-constructs it from `SUPABASE_URL` and `SUPABASE_DB_PASSWORD`, connecting directly via `db.[ref].supabase.co:5432`.

---

*Last updated: May 2026 | Phase: 1*
