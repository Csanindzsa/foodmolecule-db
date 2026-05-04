# nutrii

> **Formerly:** FoodMolecule-DB / Nutri  
> **Vision:** A fully autonomous, AI-driven database that maps every known food ingredient on Earth to its molecular composition, continuously updates safety scores from live PubMed research via OpenRouter LLMs, and delivers real-time health intelligence through a web platform and mobile app with ingredient scanning.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)
[![Phase](https://img.shields.io/badge/Phase-2%20Complete-blue)](#)

## What is nutrii?

nutrii maps every food ingredient to its molecular composition, automatically analyzes new scientific studies from PubMed, and delivers transparent, AI-updated safety scores — with no login required, no paywalls, and no human gatekeepers.

## Quick Start

```bash
git clone https://github.com/Csanindzsa/foodmolecule-db.git nutrii
cd nutrii
cp .env.example .env
# Fill in your OPENROUTER_API_KEY and Supabase credentials
```

**No Docker required.** This project connects directly to your hosted Supabase PostgreSQL database for both local development and production. Docker is available optionally if you prefer a fully offline local stack.

## Project Structure

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full roadmap.

```
nutrii/
├── infra/          # Phase 1 — Docker, Supabase config
├── docs/           # Legacy audit, ER diagrams, press kit
├── schema/         # JSON Schema files for all entities
├── data/seed/      # Phase 3 — Auto-ingested seed data
├── guides/         # Phase 6 — Per-ingredient AI guides
├── ban_list/       # Phase 9 — Ban list + regulatory tracker
├── classification/ # Phase 7 — Harm levels & types
├── processing/     # Phase 8 — Neutralization guides
├── scripts/        # Phase 3 & 5 — Data pipeline + PubMed watcher
├── backend/        # Phase 10 — Django REST API
├── web/            # Phase 11 — React frontend
├── mobile/         # Phase 12 — Expo mobile app
└── ai/             # Phase 4, 5, 6, 13 — OpenRouter agents
```

## Technology Stack

| Layer | Tool |
|-------|------|
| Database | Supabase PostgreSQL |
| Backend | Django 5 + DRF |
| Cache | Redis |
| Search | MeiliSearch |
| Web Frontend | React 19 + Vite + Tailwind v4 |
| Mobile | Expo (React Native) |
| AI Inference | OpenRouter API |
| Auth | **None** (fully public) |

## Implementation Progress

- [x] Phase 0 — Legacy Audit & Project Bootstrap
- [x] Phase 1 — Infrastructure & Database (Supabase)
- [x] Phase 2 — Data Architecture & Schema
- [x] Phase 3 — Automated Data Collection Pipeline
- [x] Phase 4 — OpenRouter AI Agent System
- [x] Phase 5 — PubMed Auto-Ingestion & Safety Adjustment
- [x] Phase 6 — Agent Instruction Guide System
- [x] Phase 7 — Harm Classification & Health Index Engine
- [x] Phase 8 — Processing & Neutralization Guide
- [x] Phase 9 — Ban List & Regulatory Mapping
- [x] Phase 10 — Backend API (Django + DRF)
- [x] Phase 11 — Web Frontend
- [x] Phase 12 — Mobile Application
- [x] Phase 13 — AI / OCR Ingredient Scanner
- [x] Phase 14 — Launch, Analytics & Scaling

## License

MIT — see [LICENSE.md](LICENSE.md)
