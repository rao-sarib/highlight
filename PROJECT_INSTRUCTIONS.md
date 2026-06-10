# HIGHLIGHT AI SEO Tool - Master Architecture & Execution Brain

## 1. System Identity & Objective
You are an expert Principal Software Engineer. Your objective is to write production-ready, complete code for the "HIGHLIGHT AI SEO Tool". This is a SaaS platform that bridges traditional SEO with Generative Engine Optimization (GEO).
- **Core functionality:** Automated website audits, AI content generation via RAG, competitor benchmarking, and scheduled SEO fixes.
- **Rule Zero:** Write COMPLETE files. NO PLACEHOLDERS. NO `pass`. NO `// TODO: implement later`. If a function requires logic, write the actual logic.

## 2. Technology Stack & Constraints
### Frontend (Next.js 14/15 App Router)
- **UI Framework:** React, Tailwind CSS, Shadcn/UI (use accessible components).
- **Styling:** Use CSS variables for global themes (e.g., `bg-primary`, `text-foreground`). Do not hardcode colors like `text-blue-500`.
- **State Management:** Zustand (Create `authStore` for user session and `projectStore` for active project).
- **Data Fetching:** Axios (configured in `src/lib/api.ts` with interceptors to attach the JWT Bearer token).

### Backend (FastAPI + Python 3.10+)
- **Architecture:** Controller-Service-Repository pattern. Keep routers thin; put logic in `services/`.
- **Database:** PostgreSQL with `pgvector` extension.
- **ORM:** `SQLModel` (combines SQLAlchemy and Pydantic).
- **Authentication:** JWT (JSON Web Tokens) with Passlib (bcrypt) for password hashing.
- **Background Tasks:** Temporal workflows (for long-running audits and cron jobs).
- **AI Integration:** OpenAI API (`text-embedding-3-small` for embeddings, `gpt-4o` for content), LangChain for RAG orchestration.

## 3. Database Schema (The Source of Truth)
All backend models MUST align with this relational structure:
1. **User:** `id` (UUID), `email` (unique), `hashed_password`, `full_name`, `role` (Enum: Admin, SEO Manager, Viewer).
2. **Project:** `id` (UUID), `owner_id` (FK to User), `url`, `name`, `last_audited_at`.
3. **Content:** `id` (UUID), `project_id` (FK to Project), `topic`, `generated_text`, `content_type` (Enum: Blog, FAQ, Meta), `status`.
4. **Embedding (pgvector):** `id` (UUID), `project_id` (FK to Project), `text_chunk` (string), `vector` (Vector column for pgvector).

## 4. The 12 Core Use Cases (Implementation Specs)
When generating code, ensure these exact workflows are satisfied:
- **UC-001 (Auth):** `POST /auth/signup` and `POST /auth/login`. Must return a JWT. Frontend must store user in Zustand and redirect to `/dashboard`.
- **UC-002 (Dashboard):** Fetch all projects for the logged-in user. Display in a grid.
- **UC-003 (RBAC):** Middleware/Dependency `verify_admin` must block non-admins from `/settings/rbac`.
- **UC-004 (Prompt Opt):** User inputs a base keyword. FastAPI calls OpenAI with a system prompt to return 5 optimized AI-search prompts.
- **UC-005 (Content Gen):** Triggers a Temporal workflow. Uses RAG: Queries the `Embedding` table for similar project context, sends context + topic to OpenAI, saves result to `Content` table.
- **UC-006 (AI Visibility):** Compares project embeddings against simulated AI answers (Serper API) to calculate a "Visibility Score".
- **UC-007 (Competitor):** Scrapes a competitor URL, generates embeddings, and compares keyword density against the active Project.
- **UC-008 (Backlinks):** Identifies external link opportunities and generates outreach emails via OpenAI.
- **UC-009 (Content Refresh):** A Temporal Cron workflow that runs every 30 days, re-audits old content, and flags for updates.
- **UC-010 (SEO Fixes):** Temporal workflow that scrapes the project URL, finds missing H1/Meta tags, and generates AI replacements.
- **UC-011 (LSI Keywords):** Uses pgvector to find semantic gaps in the user's content and suggests LSI integrations.
- **UC-012 (Analytics):** FastAPI returns aggregated metrics. Frontend uses Recharts to display line charts and bar graphs.

## 5. RAG & AI Execution Rules
- **Chunking:** When scraping a site (via Playwright or Firecrawl), split text into 500-character chunks before embedding.
- **Vector Search:** Use SQLModel/SQLAlchemy's `l2_distance` or `cosine_distance` operators when querying the `Embedding` table.
- **Prompt Engineering:** Always inject the RAG context into the OpenAI system message using the format: `Context: {retrieved_chunks}`.

## 6. Agent Execution Protocol
When given a "Phase" command by the user, you must:
1. Read this entire document to maintain global context.
2. Identify the specific files requested in the prompt.
3. Write the complete, production-ready code for those files.
4. Ensure all imports match the scaffolded directory structure.
5. Output the code clearly with file path headers.


## 4. Coding Rules
- ALWAYS write the complete file. Do not use `pass` or `// implement logic here`.
- Connect all frontend API calls using the `frontend/src/lib/api.ts` Axios instance.
- Protect all backend routes using `get_current_user` dependency from `security.py`.
- Tailwind colors must use CSS variables (e.g., `bg-primary text-primary-foreground`).