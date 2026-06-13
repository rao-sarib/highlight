"""
Project context + auto-mode helpers.

Lets every feature run with zero manual input by resolving a keyword/topic from
the project's detected niche + keywords, and guards manual input so it stays
relevant to the site (e.g. a library site can't target "home rental").
"""

from __future__ import annotations

from fastapi import HTTPException, status

from app.models.project import Project
from app.services.llm_service import llm_service


def effective_niche(project: Project) -> str:
    """The niche to use: user-declared first, else auto-detected."""
    return (project.niche or project.detected_niche or "").strip()


def has_audit(project: Project) -> bool:
    """True once the site has been crawled/audited (niche/keywords available)."""
    return bool(project.detected_niche) or bool(project.detected_keywords) or project.pages_crawled > 0


def primary_keyword(project: Project) -> str | None:
    """Best default keyword for auto-mode: a detected keyword, else the niche."""
    if project.detected_keywords:
        return str(project.detected_keywords[0])
    return effective_niche(project) or None


async def assert_relevant(project: Project, term: str) -> None:
    """Block manual input that's clearly unrelated to the site's niche.

    No-op until the site has a known niche. Cheap-path skips the LLM when the
    term already overlaps a detected keyword / the niche.
    """
    niche = effective_niche(project)
    if not niche:
        return
    low = term.strip().lower()
    known = [str(k).lower() for k in (project.detected_keywords or [])]
    known.append(niche.lower())
    if any(low and (low in k or k in low) for k in known):
        return
    relevant, reason = await llm_service.check_keyword_relevance(term, niche, project.name)
    if not relevant:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"“{term}” doesn't match this project's niche "
                f"({niche}). {reason} Use a related keyword, or re-run the audit."
            ),
        )


async def resolve_keyword(project: Project, provided: str | None) -> str:
    """Return a usable keyword: the (relevance-checked) manual one, or an auto one."""
    term = (provided or "").strip()
    if term:
        await assert_relevant(project, term)
        return term
    auto = primary_keyword(project)
    if not auto:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "No keyword provided and none detected yet. Run the site audit "
                "(SEO Fixes or Full Analysis) first, then this works automatically."
            ),
        )
    return auto
