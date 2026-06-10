# Highlight — AI SEO Tool

An AI-powered SEO automation platform that optimises websites for both traditional search engines and modern AI answer engines (ChatGPT, Perplexity, Google AI Overviews). Built as a Final Year Project (FYP) at HiTec University, Lahore.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Prerequisites](#3-prerequisites)
4. [API Keys You Need](#4-api-keys-you-need)
5. [Quick Start — Full Stack via Docker](#5-quick-start--full-stack-via-docker)
6. [Local Development Setup (no Docker)](#6-local-development-setup-no-docker)
   - [6.1 Start infrastructure containers](#61-start-infrastructure-containers)
   - [6.2 Backend (FastAPI)](#62-backend-fastapi)
   - [6.3 Temporal Worker](#63-temporal-worker)
   - [6.4 Frontend (Next.js)](#64-frontend-nextjs)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Feature Availability by API Key](#8-feature-availability-by-api-key)
9. [Application URLs](#9-application-urls)
10. [Project Structure](#10-project-structure)
11. [How Each Feature Works](#11-how-each-feature-works)
12. [GEO Implementation Status](#12-geo-implementation-status)
13. [Troubleshooting](#13-troubleshooting)
14. [Setup After Cloning From GitHub](#14-setup-after-cloning-from-github)

---

## 1. Project Overview

Highlight is a SaaS platform that bridges traditional SEO with **Generative Engine Optimisation (GEO)** — the practice of making website content visible inside AI-generated answers. Users create projects for their websites and get access to:

| Feature | What it does |
|---|---|
| **SEO Audit & Fixes** | Scrapes your site, detects issues (missing H1, thin content, no alt text), generates AI fix suggestions |
| **Prompt Optimisation** | Uses OpenAI to turn a seed keyword into 5 GEO-ready prompts |
| **Content Generation** | Generates blog posts, FAQs, and meta content using your site's context (RAG) |
| **AI Visibility** | Checks if your site is cited in Perplexity answers; falls back to OpenAI cosine-similarity scoring |
| **Competitor Benchmarking** | Gets real Google SERP rankings via Serper API + keyword density comparison |
| **Backlinks** | Finds outreach opportunities and drafts personalised emails via OpenAI |
| **LSI Keywords** | Extracts semantic keywords from your site's indexed content |
| **Content Refresh** | Schedules a monthly Temporal cron workflow to re-audit and update stale content |
| **Analytics** | Per-project SEO trend dashboard |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS, Zustand, Recharts |
| Backend | FastAPI (Python 3.13), SQLModel ORM, pgvector RAG |
| Database | PostgreSQL 15 + pgvector extension |
| Workflows | Temporal (background jobs, cron scheduling) |
| AI | OpenAI GPT-4o (content, fixes, prompts), text-embedding-3-small (RAG) |
| GEO APIs | Perplexity API (AI citation visibility), Serper API (real SERP data) |
| Cache / Queue | Redis |
| Containerisation | Docker + Docker Compose |

---

## 3. Prerequisites

Install these before starting:

| Tool | Min version | Download |
|---|---|---|
| Docker Desktop | 24+ | https://www.docker.com/products/docker-desktop |
| Node.js | 20+ | https://nodejs.org |
| Python | 3.11+ | https://www.python.org |
| Git | any | https://git-scm.com |

Verify:
```bash
docker --version       # Docker version 24+
docker compose version # Docker Compose v2.20+
node --version         # v20+
python --version       # Python 3.11+
```

---

## 4. API Keys You Need

Copy `.env.example` to `.env` and fill in these values:

| Key | Required for | Where to get it | Free tier |
|---|---|---|---|
| `OPENAI_API_KEY` | Prompts, content, embeddings, fixes, backlinks | https://platform.openai.com/api-keys | $5 credit on signup |
| `SERPER_API_KEY` | Real Google SERP rankings in Competitor Benchmarking | https://serper.dev | 2,500 queries/month |
| `PERPLEXITY_API_KEY` | Citation-based AI Visibility score | https://www.perplexity.ai/settings/api | Pay-as-you-go |
| `GA4_SERVICE_ACCOUNT_FILE` | Real Google Analytics 4 traffic charts on the Analytics page | Google Cloud Console (free) | Free |

> **Without Serper/Perplexity keys:** The features still work using fallback methods (web scraping for competitors, OpenAI cosine similarity for visibility). The app does not break.
>
> **Without GA4 setup:** The Analytics page still shows real content/embedding metrics from our own database — it just skips the GA4 traffic section. See [section 14](#14-setup-after-cloning-from-github) for the GA4 setup procedure.

---

## 5. Quick Start — Full Stack via Docker

This is the recommended way to run the entire project with one command.

### Step 1 — Clone / navigate to the project

```bash
cd "f:/University/Highlight tool"
```

### Step 2 — Configure environment variables

```bash
# Copy the example file
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux
```

Open `.env` and fill in at minimum:
```env
OPENAI_API_KEY=sk-...          # required
SERPER_API_KEY=                # optional but recommended
PERPLEXITY_API_KEY=            # optional but recommended
```

### Step 3 — Start the full stack

```bash
docker compose up --build
```

This starts **7 services** in order:
1. `db` — PostgreSQL with pgvector extension (port 5433)
2. `redis` — Redis cache (port 6379)
3. `temporal` — Temporal workflow server (port 7233)
4. `temporal-ui` — Temporal admin dashboard (port 8088)
5. `backend` — FastAPI server (port 8000)
6. `worker` — Temporal Python worker (background)
7. `frontend` — Next.js (port 3000)

### Step 4 — Open the app

```
http://localhost:3000
```

### Step 5 — Create an account and start

1. Click **Get Started** on the landing page
2. Sign up with any email/password
3. Click **Projects** in the sidebar → **New project**
4. Enter your website name and URL
5. All features are now available in the sidebar

### Stop the stack

```bash
docker compose down           # stop but keep data
docker compose down -v        # stop and delete all data (fresh start)
```

---

## 6. Local Development Setup (no Docker)

Use this when you want hot-reload for the backend or frontend without rebuilding Docker images.

### 6.1 Start infrastructure containers

Run only the infrastructure (database, Redis, Temporal) in Docker:

```bash
docker compose up db redis temporal temporal-ui -d
```

Wait ~10 seconds for Temporal to finish initialising.

### 6.2 Backend (FastAPI)

Open a terminal in the `backend/` directory:

```bash
cd backend

# Create virtual environment (first time only)
python -m venv .venv

# Activate venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux

# Install dependencies (first time only)
pip install -r requirements.txt

# Make sure backend/.env has your API keys (see Section 7)
# Start the server with hot-reload
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The FastAPI server starts at **http://127.0.0.1:8000**  
Interactive API docs: **http://127.0.0.1:8000/docs**

### 6.3 Temporal Worker

Open a **second terminal** in `backend/`:

```bash
cd backend
.venv\Scripts\activate          # Windows

# Start the Temporal worker (handles content gen, SEO fixes, content refresh)
python -m app.temporal.worker
```

You should see:
```
INFO: Connecting Temporal worker to localhost:7233 (namespace=default, queue=highlight-seo-task-queue)
```

Keep this terminal open. The worker must be running for:
- Content Generation (`/projects/:id/content-gen`)
- SEO Fixes (`/projects/:id/fixes`)
- Content Refresh (`/projects/:id/refresh`)

### 6.4 Frontend (Next.js)

Open a **third terminal** in `frontend/`:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Make sure frontend/.env.local exists:
# NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1

# Start dev server with hot-reload
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## 7. Environment Variables Reference

### Root `.env` and `backend/.env`

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://admin:password@localhost:5433/highlight_seo` | PostgreSQL connection string. Use port **5433** locally (Docker maps 5433→5432 to avoid clashes). Use port **5432** inside Docker containers. |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `SECRET_KEY` | `super-secret-change-me-in-production` | JWT signing secret — **change this in production** |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | JWT expiry in minutes |
| `OPENAI_API_KEY` | _(empty)_ | OpenAI API key — required for AI features |
| `SERPER_API_KEY` | _(empty)_ | Serper API key — enables real SERP data in Competitor Benchmarking |
| `PERPLEXITY_API_KEY` | _(empty)_ | Perplexity API key — enables citation-based AI Visibility scoring |
| `TEMPORAL_SERVER_URL` | `localhost:7233` | Temporal gRPC address (use `temporal:7233` inside Docker) |
| `TEMPORAL_NAMESPACE` | `default` | Temporal namespace |
| `TEMPORAL_TASK_QUEUE` | `highlight-seo-task-queue` | Temporal task queue name |
| `GA4_SERVICE_ACCOUNT_FILE` | _(empty)_ | Filename of a Google service-account JSON key placed in `backend/`. Optional — enables real GA4 traffic data. See [section 14](#14-setup-after-cloning-from-github). |

### `frontend/.env.local`

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000/api/v1` | Backend API URL visible to the browser |

---

## 8. Feature Availability by API Key

```
Feature                     │ OPENAI │ SERPER │ PERPLEXITY │ TEMPORAL
────────────────────────────┼────────┼────────┼────────────┼─────────
Auth & project management   │   —    │   —    │     —      │    —
Analytics dashboard         │   —    │   —    │     —      │    —
Prompt Optimisation         │  REQ   │   —    │     —      │    —
LSI Keywords                │   —    │   —    │     —      │    —
Content Generation          │  REQ   │   —    │     —      │   REQ
SEO Fixes / Audit           │  REQ   │   —    │     —      │   REQ
Content Refresh (cron)      │  REQ   │   —    │     —      │   REQ
AI Visibility (Perplexity)  │   —    │   —    │    REQ     │    —
AI Visibility (fallback)    │  REQ   │   —    │     —      │    —
Competitor Benchmarking     │   —    │   opt  │     —      │    —
  + real SERP rankings      │   —    │   REQ  │     —      │    —
Backlinks + outreach email  │  REQ   │   —    │     —      │    —

REQ = required for this feature to function
opt = optional — feature works without it but adds extra data
 —  = not used by this feature
```

---

## 9. Application URLs

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:3000 | Main application |
| FastAPI backend | http://localhost:8000 | REST API |
| FastAPI docs | http://localhost:8000/docs | Swagger UI (all endpoints) |
| Health check | http://localhost:8000/health | Returns `{"status":"ok"}` |
| Temporal UI | http://localhost:8088 | Monitor workflow runs |

---

## 10. Project Structure

```
f:/University/Highlight tool/
├── .env                        ← root env (docker-compose reads OPENAI_API_KEY from here)
├── .env.example                ← copy this to .env, fill in keys
├── docker-compose.yml          ← full-stack orchestration
│
├── backend/
│   ├── .env                    ← backend-specific env (uvicorn reads this in local dev)
│   ├── requirements.txt
│   └── app/
│       ├── main.py             ← FastAPI entry point, registers all routers
│       ├── core/
│       │   ├── config.py       ← all env vars via Pydantic Settings
│       │   └── security.py     ← JWT + bcrypt
│       ├── db/session.py       ← SQLModel + PostgreSQL session
│       ├── models/             ← User, Project, Content, Embedding (pgvector)
│       ├── schemas/            ← Pydantic request/response schemas
│       ├── api/v1/
│       │   ├── auth.py         ← POST /auth/signup, POST /auth/login
│       │   ├── users.py        ← GET /users/me, RBAC management
│       │   ├── projects.py     ← CRUD /projects
│       │   ├── prompts.py      ← POST /prompts/optimize
│       │   ├── content.py      ← POST /content/generate, GET /content/project/:id
│       │   ├── visibility.py   ← POST /visibility/score (Perplexity + OpenAI)
│       │   ├── competitors.py  ← POST /competitors/benchmark (Serper + scraping)
│       │   ├── backlinks.py    ← POST /backlinks/opportunities
│       │   ├── lsi.py          ← POST /lsi/suggest
│       │   ├── fixes.py        ← POST /fixes/run (Temporal workflow)
│       │   ├── refresh.py      ← POST /refresh/schedule (Temporal cron)
│       │   └── analytics.py    ← GET /analytics/:id
│       ├── services/
│       │   ├── llm_service.py       ← OpenAI wrapper (embeddings, content, fixes)
│       │   ├── rag_service.py       ← pgvector semantic search
│       │   ├── scraper_service.py   ← async website scraper (httpx + BeautifulSoup)
│       │   ├── serper_service.py    ← Serper API (Google SERP data)
│       │   └── seo_analyzer.py      ← on-page SEO issue detection
│       └── temporal/
│           ├── worker.py            ← Temporal worker entry point
│           ├── activities/          ← scrape, analyze, embed, generate, fix
│           └── workflows/
│               ├── audit_workflow.py   ← main audit orchestration
│               └── refresh_workflow.py ← cron refresh
│
└── frontend/
    ├── .env.local              ← NEXT_PUBLIC_API_BASE_URL
    └── src/
        ├── app/
        │   ├── page.tsx               ← landing page
        │   ├── (auth)/login           ← login page
        │   ├── (auth)/signup          ← signup page
        │   ├── dashboard/             ← project tiles overview
        │   ├── projects/
        │   │   ├── page.tsx           ← projects list
        │   │   ├── new/               ← create project
        │   │   └── [projectId]/
        │   │       ├── page.tsx       ← project analytics
        │   │       ├── prompts/       ← prompt optimisation
        │   │       ├── content-gen/   ← content generation
        │   │       ├── visibility/    ← AI visibility
        │   │       ├── competitors/   ← competitor benchmarking
        │   │       ├── backlinks/     ← backlink outreach
        │   │       ├── lsi-keywords/  ← LSI keywords
        │   │       ├── fixes/         ← SEO fixes
        │   │       └── refresh/       ← content refresh
        │   └── settings/rbac/         ← admin role management
        ├── components/global/
        │   ├── AppShell.tsx           ← layout wrapper
        │   ├── Sidebar.tsx            ← navigation sidebar
        │   ├── Header.tsx             ← top bar
        │   └── feature-page-frame.tsx ← reusable page template
        ├── lib/
        │   ├── api.ts                 ← Axios with JWT interceptor
        │   └── utils.ts
        └── store/
            ├── authStore.ts           ← Zustand auth state
            └── projectStore.ts        ← Zustand project state (with 60s TTL cache)
```

---

## 11. How Each Feature Works

### Prompt Optimisation
1. User enters a seed keyword (e.g. "AI SEO software")
2. `POST /prompts/optimize` → `llm_service.optimize_prompts(keyword)`
3. OpenAI GPT-4o returns 5 GEO-ready prompt variations as JSON
4. Frontend displays each prompt with a copy button

### Content Generation
1. User enters a topic and selects content type (blog / FAQ / meta)
2. `POST /content/generate` → FastAPI starts a **Temporal workflow** (`AuditWorkflow`)
3. Workflow: scrape site → embed text into pgvector → retrieve context chunks → generate content with RAG
4. Content saved to `contents` table; listed at `GET /content/project/:id`

### AI Visibility
**With PERPLEXITY_API_KEY:**
- Queries Perplexity with "What are the best resources for: {keyword}?"
- Checks if your project URL appears in Perplexity's cited sources
- Score = 100 if cited, else OpenAI cosine similarity of Perplexity's answer vs your embeddings

**Without (fallback):**
- OpenAI simulates an AI answer to the keyword
- Cosine similarity between the simulated answer vector and your site's pgvector embeddings
- Score = 0–100 (percentage alignment)

### Competitor Benchmarking
**With SERPER_API_KEY:**
- Serper fetches top-10 Google SERP results for the keyword
- Finds your competitor's rank position in those results
- Shows top-5 organic SERP entries with title, URL, snippet

**Always (web scraping):**
- Scrapes competitor URL for body text
- Calculates keyword density (yours vs theirs)
- Extracts top terms the competitor uses that you don't (semantic gap)

### SEO Fixes
1. `POST /fixes/run` → starts Temporal `AuditWorkflow`
2. Workflow: scrape project URL → `seo_analyzer` detects issues (missing H1, thin content, missing meta, no alt text) → `llm_service.generate_seo_fixes()` → saves as "meta" content

### Backlinks
1. User provides a keyword and optional prospect URLs
2. Backend scrapes external links from the project site
3. For each prospect: scrapes their page → OpenAI writes a personalised outreach email
4. Returns list of prospects with email templates ready to send

### Content Refresh
1. User clicks "Schedule monthly refresh"
2. `POST /refresh/schedule` → Temporal `start_workflow` with `cron_schedule="0 0 */30 * *"`
3. Every 30 days: re-scrapes the site, re-indexes content, checks for SEO regressions

---

## 12. GEO Implementation Status

| SRS Requirement | Implemented | Method |
|---|---|---|
| FR1-FR5: Auth & user management | ✅ | JWT + bcrypt + RBAC |
| FR6-FR10: Project & SEO audit | ✅ | Temporal + BeautifulSoup |
| FR11-FR13: Analytics dashboard | ⚠️ Seeded mock | Real GA/GSC integration needs OAuth setup |
| FR14-FR16: Keyword & prompt optimisation | ✅ | OpenAI GPT-4o |
| FR17-FR19: Content generation (blog/FAQ/meta) | ✅ | Temporal + OpenAI + pgvector RAG |
| FR20-FR21: AI Visibility | ✅ | Perplexity citations + OpenAI fallback |
| FR22-FR23: Competitor benchmarking | ✅ | Serper SERP data + web scraping |
| FR24-FR25: Backlinks + outreach email | ✅ | OpenAI GPT-4o |
| FR26-FR28: Content refresh / cron | ✅ | Temporal cron schedule |
| RBAC (admin / manager / viewer) | ✅ | Role-based middleware |

---

## 13. Troubleshooting

### Backend won't start — database connection error
```
sqlalchemy.exc.OperationalError: could not connect to server
```
**Fix:** Start the database container first:
```bash
docker compose up db -d
```
Wait 5 seconds, then start the backend.

### "Workflow engine is not available"
Content Generation / SEO Fixes / Content Refresh shows this error.

**Fix:** Start Temporal and the Temporal worker:
```bash
# Start Temporal server
docker compose up temporal -d

# Start the Python worker (in backend/ with venv activated)
python -m app.temporal.worker
```

### AI Visibility returns score 0 with no explanation
**Fix:** Run the SEO Fixes workflow first. It indexes your site's content into pgvector. Without embeddings, there is nothing to compare against.

### OPENAI_API_KEY not found
**Fix:** Make sure `backend/.env` contains the key (not just the root `.env`):
```env
OPENAI_API_KEY=sk-...
```

### Frontend can't reach the backend (network error)
**Fix:** Check `frontend/.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```
Restart the frontend after editing `.env.local`.

### Port 5433 already in use
Change the host port in `docker-compose.yml`:
```yaml
ports:
  - "5434:5432"     # use 5434 instead
```
And update `DATABASE_URL` in `backend/.env` accordingly.

### Perplexity API returns no citations
Some queries don't trigger citations. This is normal — the score falls back to cosine similarity in that case.

---

## 14. Setup After Cloning From GitHub

This repo's `.gitignore` excludes secrets, dependencies, and build output, so a
fresh clone is **source-only**. Follow these steps to get it running.

### 14.1 Files you must create (none of these are in the repo)

| File | Required? | Purpose |
|---|---|---|
| `backend/.env` | **Yes** | Backend secrets — DB, JWT, OpenAI, etc. |
| `frontend/.env.local` | **Yes** | Tells the frontend where the backend API is |
| `.env` (repo root) | Only if using `docker-compose` | Same keys as `backend/.env`, used by Compose |
| `backend/<your-ga4-key>.json` | No (optional) | Google service-account key — only for real GA4 charts |

For each, copy the reference template and fill in real values:

```bash
cp .env.example backend/.env
cp .env.example .env                 # only if you use docker-compose
```

For `frontend/.env.local`, create it manually with:
```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### 14.2 Required keys (app won't start / core features break without these)

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | `backend/.env` | Default works if you run `docker compose up db -d` |
| `SECRET_KEY` | `backend/.env` | Any random string — used to sign JWTs |
| `OPENAI_API_KEY` | `backend/.env` | **Get your own key** at https://platform.openai.com/api-keys. Required for Prompt Optimisation, Content Generation, SEO Fixes, Backlinks, embeddings, and AI Visibility fallback. |

### 14.3 Optional keys (app runs fine without these — fallbacks kick in)

| Variable | Where | What you lose without it |
|---|---|---|
| `SERPER_API_KEY` | `backend/.env` | Competitor Benchmarking falls back to scraping + keyword density (no real SERP ranks) |
| `PERPLEXITY_API_KEY` | `backend/.env` | AI Visibility falls back to OpenAI cosine-similarity scoring |
| `GA4_SERVICE_ACCOUNT_FILE` | `backend/.env` | Analytics page skips the GA4 traffic section but still shows real content/embedding metrics from the database |

### 14.4 Optional: enabling real Google Analytics 4 data

This is entirely optional and skippable — the Analytics page works without it.

**One-time, server-side (you, the developer/operator):**
1. In [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project.
2. Enable the **Google Analytics Data API** for that project.
3. Create a **Service Account**, then create a JSON key for it and download it.
4. Save that JSON file inside `backend/` (e.g. `backend/ga4-service-account.json`) — it's gitignored, so it stays local/private.
5. In `backend/.env`, set:
   ```env
   GA4_SERVICE_ACCOUNT_FILE=ga4-service-account.json
   ```
6. Restart the backend.

**Per-website, done by each end user (no developer involvement needed):**
1. Open the project's **Analytics** page in the app.
2. If GA4 is configured server-side, a guide appears with the service account's email address.
3. In Google Analytics, go to **Admin → Property Access Management** for that website's GA4 property, add the service account email as a **Viewer**.
4. In Google Analytics, go to **Admin → Property Settings** and copy the numeric **Property ID**.
5. Paste that ID into the **GA4 Property ID** field on the Analytics page and click **Save**.

If a user skips all of this, the Analytics page simply shows the existing
content metrics (total content pieces, indexed chunks, content-by-type, and
the weekly content-generation chart) — nothing breaks.

### 14.5 Then start the app

Follow [section 5 (Docker)](#5-quick-start--full-stack-via-docker) or
[section 6 (local dev)](#6-local-development-setup-no-docker) as normal.

---

## Authors

| Name | Roll No | Email |
|---|---|---|
| Mohammad Sarib Ali | 22-SE-092 | 22-se-092@student.hitecuni.edu.pk |
| Eman Ali | 22-SE-076 | 22-se-076@student.hitecuni.edu.pk |
| Hamna Imran | 22-SE-070 | 22-se-070@student.hitecuni.edu.pk |

**Instructor:** Ms. Yousra Zafar | **TA:** Mr. Aniq Rehman  
HiTec University, Lahore — Software Engineering Section A
