-- nutrii — PostgreSQL initialization script
-- Runs once on first container start (docker-entrypoint-initdb.d)
-- Enables required PostgreSQL extensions for nutrii.

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search + trigram similarity (for fuzzy ingredient search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- GIN indexes on JSONB and array columns
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Audit logging (mirrors Supabase pgaudit setup)
CREATE EXTENSION IF NOT EXISTS "pgaudit";

-- Roles mirroring Supabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN SUPERUSER;
  END IF;
END
$$;
