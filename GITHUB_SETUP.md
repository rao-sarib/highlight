# GitHub Repository Setup

Reference values for configuring the GitHub repository page. Copy-paste ready — nothing here needs to be committed for the app to work; it's just for the "Manual GitHub Tasks" step before/after publishing.

## Repository Name

```
highlight
```

(Current remote is `rao-sarib/HIGHLIGHT` — keep as-is, or rename to lowercase `highlight` for convention; GitHub repo names are case-insensitive in URLs either way.)

## Repository Description

*(GitHub → Settings → General → "Description", max ~350 chars but keep it to one line)*

```
AI-powered SEO & AI Visibility (GEO) SaaS platform — audits websites, generates AI content via RAG, and scores brand citations across ChatGPT, Perplexity, and Google AI Overviews.
```

## Suggested Topics

*(GitHub → repo home → gear icon next to "About" → Topics)*

```
seo
generative-engine-optimization
ai
nextjs
fastapi
postgresql
pgvector
temporal
openai
saas
rag
typescript
python
docker
```

## Suggested About Section

*(GitHub → repo home → gear icon next to "About")*

- **Description:** (same as above)
- **Website:** `https://highlight-teal.vercel.app`
- **Topics:** (list above)
- ☑ Releases
- ☑ Packages (only if you publish any)

## Suggested Website URL

```
https://highlight-teal.vercel.app
```

## Social Preview Image

`docs/social-preview.png` (1280×640) is already in the repo. To set it:

1. GitHub repo → **Settings** → scroll to **Social preview**
2. Click **Edit** → upload `docs/social-preview.png`

## Suggested Release Title (v1.0.0)

```
v1.0.0 — Initial Public Release
```

## Suggested Release Description

Use the full content of [`RELEASE_NOTES.md`](RELEASE_NOTES.md) as the release body — it already contains
New Features, Technical Highlights, Architecture, Known Limitations, and Future Improvements sections
ready to paste in as-is when creating the GitHub Release.

## Manual GitHub Tasks (cannot be done locally)

- [ ] Set repository description, topics, and website URL (values above)
- [ ] Upload `docs/social-preview.png` under Settings → Social preview
- [ ] Create the `v1.0.0` GitHub Release using `RELEASE_NOTES.md` as the body
- [ ] Pin the repository on your GitHub profile, if desired
- [ ] Enable branch protection on `main`, if desired
