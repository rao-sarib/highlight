# v1.0.0 — Initial Public Release

> Prepared locally for the first public GitHub release. No GitHub Release has been published —
> this file is the draft content to paste in when one is created (see "Manual GitHub Tasks" in the repo audit).

## Overview

Highlight is a full-stack AI SEO and **Generative Engine Optimisation (GEO)** platform: it audits
websites for classic SEO, and — its core differentiator — measures and improves how often a brand
is *cited* inside AI-generated answers from ChatGPT, Perplexity, and Google AI Overviews.

This release marks the first version considered feature-complete and stable enough for public release,
following a full internal build-out and a subsequent "full-system test" hardening pass.

## New Features

- **SEO Audit & Fixes** — whole-site crawler (sitemap + bounded BFS), site-health scoring, automatic
  niche detection, and AI-generated fix suggestions for on-page issues.
- **Prompt Optimisation** — seed keyword → 5 GEO-ready prompt variations.
- **AI Content Generation** — RAG-grounded blog/FAQ/meta/GEO content generation via pgvector-indexed
  site context, run through a Temporal workflow.
- **AI Visibility (GEO)** — live, multi-engine Share-of-Voice scanning across Perplexity, OpenAI
  (`gpt-4o-search-preview`), Google AI Overview, and Gemini, with 24h result caching and scan history.
- **Competitor Benchmarking** — real Google SERP rankings (Serper) plus scraped keyword-density and
  semantic-gap analysis.
- **Backlinks & Outreach** — prospect discovery with AI-drafted personalised outreach emails.
- **LSI Keywords** — semantic keyword-gap extraction from indexed content.
- **Content Refresh** — Temporal cron workflow for periodic re-audits of stale content.
- **Run Full Analysis** — orchestrator chaining crawl → audit → niche detection → prompts → multi-engine
  scan → AI action plan, rolled into a single Highlight Score.
- **Analytics** — real database-derived metrics plus optional live Google Analytics 4 traffic charts.
- **Plans & Billing** — Free / Pro / Agency tiers with project/quota limits, feature gating, and Stripe
  Checkout scaffolding.
- **Auth & Account Management** — JWT auth, email verification, password reset, RBAC (admin / manager /
  viewer).
- **Admin Panel** — separate `/adminpanel` surface for user, content, and site-settings management.

## Technical Highlights

- **Real external integrations, not mocks**: live OpenAI, Serper, SerpApi, Perplexity, Gemini, and GA4
  Data API calls power the product end to end.
- **RAG pipeline**: `pgvector`-backed semantic search over scraped, chunked site content.
- **Temporal-orchestrated workflows** for every long-running or scheduled operation (audits, content
  generation, cron refresh), with a custom-hardened worker (unsandboxed runner, explicit model imports,
  Temporal-safe return types).
- **Multi-engine GEO scoring**: citation detection across 4 independent AI answer engines with per-engine
  and blended Share-of-Voice metrics.
- **Split production deployment**: Next.js frontend on Vercel/Netlify, FastAPI + Postgres + Temporal on
  AWS EC2 via Docker Compose, same-origin API proxying (no CORS/mixed-content issues).
- **Cypress E2E coverage**: functional, security, performance, and compatibility test suites.

## Architecture

Next.js 15 (App Router) → FastAPI (`/api/v1`) → PostgreSQL + pgvector, with Temporal handling background
workflows and Redis for caching/queuing. See the [Architecture Overview](README.md#architecture-overview)
in the README for the full diagram.

## Known Limitations

- No automated backend test suite yet (pytest) — only the frontend has E2E coverage.
- No CI pipeline (GitHub Actions) is configured.
- GA4 integration requires a manually provisioned Google Cloud service account (no self-serve OAuth flow).
- Stripe billing runs in test-mode with a demo bypass button; production live-mode checkout is not wired up.
- The EC2 backend is served over plain HTTP behind an internal proxy (no custom domain/HTTPS on the API
  origin itself).

## Future Improvements

See [Future Roadmap](README.md#future-roadmap) in the README — backend test suite, CI, self-serve GA4
OAuth, production Stripe billing, HTTPS on the API origin, and broader GEO engine coverage.

---

**Full diff:** this is the first tagged release — no prior tag exists to diff against.
