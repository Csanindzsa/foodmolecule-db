# nutrii — Project Overview

> **Formerly:** FoodMolecule-DB / Nutri
> **Vision:** A fully autonomous, AI-driven database that maps every known food ingredient on Earth to its molecular composition, continuously updates safety scores from live PubMed research via OpenRouter LLMs, and delivers real-time health intelligence through a web platform and mobile app with ingredient scanning.
> **Core Principle:** No human gatekeepers. No authentication walls. Science-backed, automatically evolving, completely open.

---

## Quick Facts

| Attribute | Value |
|-----------|-------|
| **Project Status** | Phase 2 Complete — Infrastructure + Data Architecture done |
| **Overall Progress** | 14 phases planned, 2 complete |
| **Total Commits** | 7 |
| **Lines of Code** | ~5,600 |
| **Last Updated** | May 2026 |
| **License** | MIT |

---

## Architecture Overview

```
                        CLIENTS
  +------------------+  +------------------+  +------------------+
  |   Web App        |  |  Mobile App      |  |  3rd Party       |
  |  (React/TS)      |  |(React Native)    |  |   Consumers      |
  +--------+---------+  +--------+---------+  +--------+---------+
           |                      |                      |
           +----------------------+----------------------+
                                  |
                      PUBLIC API (Django + DRF)
         No authentication. Rate limiting only. Caching enabled.
                                  |
            +---------------------+---------------------+
            |                     |                     |
            v                     v                     v
  +------------------+  +------------------+  +------------------+
  |   Supabase PG    |  |   OpenRouter     |  |   Search Index   |
  |   (Primary DB)   |  |   AI Agents      |  |  (MeiliSearch)   |
  +------------------+  +------------------+  +------------------+
            |
      +-----+-----+
      |           |
      v           v
  +--------+ +----------+
  |Storage | |  Redis   |
  |(Images)| |  (Cache) |
  +--------+ +----------+
```

---

## Technology Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Database** | Supabase PostgreSQL | Managed, scalable, no auth required |
| **Backend** | Django 5 + DRF | Rapid API dev, mature ORM |
| **Cache** | Redis | Caching, rate limiting |
| **Search** | MeiliSearch | Typo-tolerant, fast full-text search |
| **Web Frontend** | React 19 + Vite + Tailwind v4 | Modern SPA |
| **Mobile** | Expo (React Native) | Single TS codebase, OTA updates |
| **OCR** | Google Vision API + ML Kit | Hybrid accuracy/speed for label scanning |
| **AI Inference** | OpenRouter API | Dynamic model selection across LLMs |
| **AI Orchestration** | Python + Pydantic | Structured output parsing |
| **Auth** | None | Fully public read-only API |
| **Storage** | Supabase Storage | S3-compatible with CDN |
| **CI/CD** | GitHub Actions | Test, lint, build, deploy |
| **Hosting** | Vercel (web) + Supabase (data) | Global CDN |

---

## Repository Structure

```
nutrii/
  .obsidian/         # Obsidian vault config
  .env.example       # Environment template
  IMPLEMENTATION_PLAN.md  # Master plan (14 phases)
  README.md          # Project readme
  
  ai/                # OpenRouter AI agent system (Phase 4)
    consensus_selector.py
    dispatcher.py
    parsers.py
    prompts/         # 5 Jinja2 prompt templates
    tests/
  
  backend/           # Django REST API (Phase 10)
    nutrii/          # Project settings
    core/            # Models, Views, Serializers
    manage.py
    requirements.txt
  
  ban_list/          # Ban list data (Phase 9)
  classification/    # Harm classification (Phase 7)
  data/              # Seed data (Phase 3)
  docs/              # Documentation
  guides/            # Agent guide template (Phase 6)
  infra/             # Docker, Supabase config (Phase 1)
  mobile/            # Expo React Native app (Phase 12)
  obsidian/          # This documentation
  processing/        # Processing methods (Phase 8)
  schema/            # JSON Schema files (Phase 2)
  scripts/           # Pipeline + PubMed (Phase 3 & 5)
  web/               # React frontend (Phase 11)
```

---

## Key Documentation

- [[nutrii - Phase Status Dashboard]] — Detailed status of all 14 phases
- [[nutrii - Data Model Reference]] — Complete schema documentation
- [[nutrii - API Reference]] — All REST API endpoints
- [[nutrii - AI Agent System]] — OpenRouter agent architecture
- [[nutrii - Infrastructure & Deployment]] — Docker, Supabase, deployment
- [[nutrii - Pipeline & Scripts]] — Data pipeline reference
- [[nutrii - Development Guide]] — Local setup and contribution
- [[nutrii - Git History & Changelog]] — Commit history and change log
