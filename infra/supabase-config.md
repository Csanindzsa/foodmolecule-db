# Supabase Configuration Guide

> **Phase 1 Deliverable**  
> Step-by-step instructions for provisioning the nutrii Supabase project.

---

## 1. Create the Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. **Project name:** `nutrii-db`
3. **Region:** Choose closest to your primary user base (e.g., `eu-central-1` for Europe).
4. **Database password:** Generate a strong password and store it in your password manager. You will need it for `.env`.

---

## 2. Database Roles

In the Supabase SQL Editor, verify these roles exist (they are created automatically by Supabase):

```sql
-- anon: public read-only access to all published tables
-- service_role: backend-only, full access for data ingestion and AI agents
SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'service_role');
```

Row-Level Security (RLS) policies:
- All production tables have RLS **enabled**.
- The `anon` role has `SELECT` privileges on all published tables.
- The `service_role` bypasses RLS (used only by the Django backend).

---

## 3. Connection Pooling (PgBouncer)

In the Supabase dashboard → **Settings → Database → Connection Pooling**:

- **Mode:** Transaction (recommended for serverless/Django)
- **Pool Size:** 15 (free tier) or 25+ (Pro tier)
- Use the **pooler connection string** (port `6543`) in Django's `DATABASE_URL` for production.
- Use the **direct connection string** (port `5432`) for Django migrations only.

```
# Pooler (for app): postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
# Direct (for migrations): postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
```

---

## 4. Storage Buckets

In the Supabase dashboard → **Storage → New Bucket**, create:

| Bucket Name | Public | Description |
|-------------|--------|-------------|
| `food-images` | ✅ Yes | Food ingredient photos, served via CDN |
| `molecule-structures` | ✅ Yes | SVG/PNG molecular diagrams from PubChem |
| `study-attachments` | ❌ No | Optional PDFs linked to PubMed entries |

For each public bucket, apply a policy allowing public reads:

```sql
-- Allow anyone to read from food-images
CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'food-images');
```

---

## 5. Audit Logging (pgaudit)

In the Supabase SQL Editor:

```sql
-- Enable pgaudit extension
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Log all DDL and DML on nutrii tables
ALTER SYSTEM SET pgaudit.log = 'read, write, ddl';
```

Note: Full pgaudit configuration requires Supabase Pro tier. On free tier, rely on the Supabase built-in audit logs in the dashboard.

---

## 6. Environment Variables

After provisioning, collect these values from the Supabase dashboard and add them to your `.env`:

```
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=[anon public key]
SUPABASE_SERVICE_ROLE_KEY=[service role key — NEVER expose client-side]
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DATABASE_URL_DIRECT=postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
```

---

*Last updated: May 2026 | Phase: 1*
