"""
Default landing-page content (the CMS seed + fallback).

Mirrors the original hard-coded landing page. Seeded into site_content on first
startup; the admin panel edits it from there. The frontend keeps a matching
fallback so the page still renders if the API is unreachable.
"""

from __future__ import annotations

DEFAULT_LANDING: dict = {
    "brand": {"name": "Highlight"},
    "nav": [
        {"label": "Features", "href": "#features"},
        {"label": "How it works", "href": "#how"},
        {"label": "FAQ", "href": "#faq"},
    ],
    "hero": {
        "badge": "AI search visibility, built on real SEO",
        "titleLead": "When buyers ask AI,",
        "titleHighlight": "be the answer",
        "titleTail": "it gives.",
        "subtitle": (
            "Highlight tells you whether ChatGPT, Perplexity and Gemini point people to you "
            "— then audits your site and writes the content that gets you cited."
        ),
        "primaryCta": "Check your visibility",
        "secondaryCta": "See how it works",
        "note": "No credit card. Start with just your URL.",
    },
    "engines": {
        "label": "Tracks the answer engines your customers already ask",
        "items": ["ChatGPT", "Perplexity", "Gemini", "Google AI Overviews"],
    },
    "facts": [
        {"value": "3 engines", "label": "Live checks across ChatGPT, Perplexity and Gemini"},
        {"value": "Whole-site", "label": "Every page crawled, audited and scored"},
        {"value": "SEO + GEO", "label": "Traditional search and AI search in one place"},
    ],
    "features": {
        "eyebrow": "What you get",
        "title": "Everything you need to win in search — old and new.",
        "subtitle": (
            "Find out where you stand, fix what's holding you back, and publish the content "
            "that gets picked up. No switching between five different tools."
        ),
        "items": [
            {
                "icon": "Gauge",
                "title": "See if AI recommends you",
                "body": "We ask the engines your buyers ask the questions they actually type, then show where your brand appears — and who gets cited instead.",
                "wide": True,
            },
            {
                "icon": "ScanSearch",
                "title": "Audit every page",
                "body": "One crawl checks titles, meta, headings, thin content and alt text across your whole site, then scores its health.",
                "wide": False,
            },
            {
                "icon": "FileText",
                "title": "Write content AI will quote",
                "body": "For each question you're missing, generate a direct answer, key facts, an FAQ and the schema engines look for.",
                "wide": False,
            },
            {
                "icon": "Swords",
                "title": "Know who you're up against",
                "body": "Compare your pages to the ones outranking you and see the terms they cover that you don't.",
                "wide": False,
            },
            {
                "icon": "Search",
                "title": "Find the right questions",
                "body": "Turn one keyword into the prompts and supporting terms people search — pulled from your own site's context.",
                "wide": False,
            },
            {
                "icon": "ClipboardList",
                "title": "Get a plan, not a report",
                "body": "Fixes are ranked by impact and effort, with the changes drafted for you — so you know exactly what to do next.",
                "wide": False,
            },
        ],
    },
    "steps": {
        "eyebrow": "How it works",
        "title": "From a URL to a clear plan in minutes.",
        "subtitle": (
            "You don't fill out forms or wire up tools. Add your site and Highlight does the "
            "analysis, then hands you the work in priority order."
        ),
        "cta": "Run your first scan",
        "items": [
            {"title": "Add your site", "body": "Paste a URL. Highlight crawls your pages and learns your niche on its own."},
            {"title": "See where you stand", "body": "Get your AI share of voice, a site health score, and the gaps holding both back."},
            {"title": "Fix and publish", "body": "Apply the ranked fixes and generate ready-to-publish content built to earn citations."},
            {"title": "Track the climb", "body": "Re-scan to watch your AI share-of-voice climb over time, with a per-engine breakdown each run."},
        ],
    },
    "about": {
        "eyebrow": "About us",
        "title": "Built to make AI search work for real businesses.",
        "body": (
            "Highlight started with one question: when people ask AI assistants for "
            "recommendations, does your brand show up? We built a single workspace that measures "
            "your visibility across ChatGPT, Perplexity and Gemini, audits your site's SEO end to "
            "end, and generates the content that earns citations — so you grow in both traditional "
            "search and the new AI-driven search."
        ),
        "points": [
            "Measure real AI Share of Voice across every major engine",
            "Audit and fix on-page SEO across your whole site",
            "Generate GEO content that wins AI citations",
        ],
    },
    "closing": {
        "title": "Find out what AI says about you today.",
        "subtitle": "Add your site and get your first AI share-of-voice score and site audit in one run.",
        "primaryCta": "Start free",
        "secondaryCta": "Log in",
    },
    "faq": {
        "eyebrow": "FAQ",
        "title": "Questions, answered.",
        "items": [
            {
                "q": "What is Generative Engine Optimization (GEO)?",
                "a": "GEO is getting your brand mentioned and cited by AI answer engines like ChatGPT, Perplexity and Google's AI Overviews when people ask questions in your category. Highlight measures your AI share of voice across these engines and creates the content that earns citations.",
            },
            {
                "q": "How does Highlight measure AI visibility?",
                "a": "It generates the real questions buyers ask AI assistants in your niche, sends each to live engines (Perplexity, ChatGPT, and Gemini when configured), and checks whether your domain or brand is cited. You get a share-of-voice score, a per-engine breakdown, and the competitors cited instead.",
            },
            {
                "q": "Does Highlight handle traditional SEO too?",
                "a": "Yes. It crawls your whole site, audits every page for on-page issues (titles, meta descriptions, headings, thin content, image alt text), scores your site health, and writes specific fixes — alongside the GEO features, in the same workspace.",
            },
            {
                "q": "Can it create content to improve my citations?",
                "a": "For the questions where you're not cited, Highlight writes GEO-ready content: a direct answer, citable key facts, an FAQ, and FAQPage schema. Publish it, re-scan, and watch your share of voice move.",
            },
            {
                "q": "Which engines does it check?",
                "a": "Perplexity and ChatGPT out of the box, plus Google Gemini when a Gemini key is configured. Each scan shows a per-engine breakdown so you can see exactly where you win and lose citations.",
            },
        ],
    },
    "footer": {
        "tagline": "One workspace for traditional SEO and getting cited by AI answer engines.",
        "copyright": "Highlight. SEO and Generative Engine Optimization in one place.",
        "email": "highlight.aiseo@gmail.com",
    },
}
