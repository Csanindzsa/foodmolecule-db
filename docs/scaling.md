# Scaling Guide — nutrii

## Current Limits (Free Tier Stack)

| Service | Free Tier Limit | nutrii Usage |
|---------|----------------|--------------|
| Supabase | 500 MB DB, 2M reqs/mo | ~50 MB seed, ~10K reqs/mo expected |
| Render | 512 MB RAM, sleeps after 15m | Sufficient for API; use cron to keep warm |
| Vercel | 100 GB bandwidth | Static site, minimal |
| OpenRouter | Variable by model | ~$0.001–$0.01 per inference |
| Expo | Free for builds | OTA updates free |

## Scaling Triggers

1. **Database >400 MB** → Upgrade to Supabase Pro ($25/mo) or migrate to self-hosted Postgres
2. **API latency >500 ms p95** → Add read replicas, cache heavy queries in Redis
3. **OpenRouter costs >$50/mo** → Batch PubMed analyses, use cheaper models for low-confidence tasks
4. **Search volume >100K/mo** → Add MeiliSearch self-hosted or Algolia free tier

## Caching Strategy

- Redis: API response cache for `FoodDetailView` and `FoodHealthIndexView` (TTL 1 hour)
- CDN: Static assets, food images (if added later)
- Local: Mobile app caches last 50 searches in SQLite

## Read Replica Strategy

When traffic grows:
1. Route read-only API calls to Supabase read replica
2. Write operations (safety adjustments, study ingestion) stay on primary
3. Use `django-replicated` or custom DB router
