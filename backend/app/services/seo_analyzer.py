"""
SEO analyzer for detecting common on-page issues from scraped content.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

from bs4 import BeautifulSoup

from app.services.scraper_service import ScrapedPage

META_DESCRIPTION_MIN = 50
META_DESCRIPTION_MAX = 160
TITLE_MAX = 60
MIN_BODY_WORDS = 300


class Severity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


@dataclass(slots=True)
class SEOIssue:
    issue_type: str
    severity: Severity
    description: str
    suggestion: str
    current_value: str | None = None

    def to_dict(self) -> dict[str, str]:
        payload = {
            "issue_type": self.issue_type,
            "severity": self.severity.value,
            "description": self.description,
            "suggestion": self.suggestion,
        }
        if self.current_value is not None:
            payload["current_value"] = self.current_value
        return payload

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SEOIssue":
        return cls(
            issue_type=str(payload["issue_type"]).strip(),
            severity=Severity(str(payload["severity"]).strip()),
            description=str(payload["description"]).strip(),
            suggestion=str(payload["suggestion"]).strip(),
            current_value=(
                str(payload["current_value"]).strip()
                if payload.get("current_value") is not None
                else None
            ),
        )


@dataclass(slots=True)
class SEOAnalyzer:
    """Runs a focused set of practical SEO checks."""

    def analyze(self, page: ScrapedPage) -> list[SEOIssue]:
        issues: list[SEOIssue] = []
        issues.extend(self._check_title(page))
        issues.extend(self._check_h1(page))
        issues.extend(self._check_meta_description(page))
        issues.extend(self._check_body_length(page))
        issues.extend(self._check_images(page))
        return issues

    def _check_title(self, page: ScrapedPage) -> list[SEOIssue]:
        if not page.title:
            return [
                SEOIssue(
                    issue_type="missing_title",
                    severity=Severity.CRITICAL,
                    description="The page is missing a title tag.",
                    suggestion="Add a unique <title> tag in the page head.",
                )
            ]
        if len(page.title) > TITLE_MAX:
            return [
                SEOIssue(
                    issue_type="title_too_long",
                    severity=Severity.WARNING,
                    description=(
                        f"The title is {len(page.title)} characters long, which is above "
                        f"the recommended maximum of {TITLE_MAX}."
                    ),
                    suggestion="Shorten the title while keeping the primary keyword.",
                    current_value=page.title,
                )
            ]
        return []

    def _check_h1(self, page: ScrapedPage) -> list[SEOIssue]:
        h1_tags = [heading for heading in page.headings if heading.level == 1]
        if not h1_tags:
            return [
                SEOIssue(
                    issue_type="missing_h1",
                    severity=Severity.CRITICAL,
                    description="The page does not contain an H1 heading.",
                    suggestion="Add one clear H1 that matches the page intent.",
                )
            ]
        if len(h1_tags) > 1:
            return [
                SEOIssue(
                    issue_type="multiple_h1",
                    severity=Severity.WARNING,
                    description=(
                        f"The page contains {len(h1_tags)} H1 headings. Search engines "
                        "usually expect one primary H1."
                    ),
                    suggestion="Keep the strongest heading as H1 and demote the others.",
                    current_value=" | ".join(item.text for item in h1_tags),
                )
            ]
        return []

    def _check_meta_description(self, page: ScrapedPage) -> list[SEOIssue]:
        if not page.meta_description:
            return [
                SEOIssue(
                    issue_type="missing_meta_description",
                    severity=Severity.CRITICAL,
                    description="The page is missing a meta description tag.",
                    suggestion=(
                        "Add a concise meta description between 50 and 160 characters."
                    ),
                )
            ]

        description_length = len(page.meta_description)
        if description_length < META_DESCRIPTION_MIN:
            return [
                SEOIssue(
                    issue_type="short_meta_description",
                    severity=Severity.WARNING,
                    description=(
                        f"The meta description is only {description_length} characters long."
                    ),
                    suggestion="Expand it to better summarize the page and improve click-through.",
                    current_value=page.meta_description,
                )
            ]
        if description_length > META_DESCRIPTION_MAX:
            return [
                SEOIssue(
                    issue_type="long_meta_description",
                    severity=Severity.WARNING,
                    description=(
                        f"The meta description is {description_length} characters long."
                    ),
                    suggestion="Trim it to under 160 characters.",
                    current_value=page.meta_description,
                )
            ]
        return []

    def _check_body_length(self, page: ScrapedPage) -> list[SEOIssue]:
        word_count = len(page.body_text.split())
        if word_count >= MIN_BODY_WORDS:
            return []
        return [
            SEOIssue(
                issue_type="thin_content",
                severity=Severity.WARNING,
                description=(
                    f"The page contains about {word_count} visible words, which is light for "
                    "a primary landing page or article."
                ),
                suggestion="Add more helpful, specific content aligned with the target keyword.",
                current_value=str(word_count),
            )
        ]

    def _check_images(self, page: ScrapedPage) -> list[SEOIssue]:
        if not page.raw_html:
            return []

        soup = BeautifulSoup(page.raw_html, "lxml")
        images = soup.find_all("img")
        if not images:
            return []

        missing_alt = [
            image
            for image in images
            if not str(image.get("alt", "")).strip()
        ]
        if not missing_alt:
            return []

        return [
            SEOIssue(
                issue_type="images_missing_alt",
                severity=Severity.WARNING,
                description=(
                    f"{len(missing_alt)} of {len(images)} image tags are missing alt text."
                ),
                suggestion="Add descriptive alt text to improve accessibility and image SEO.",
                current_value=str(len(missing_alt)),
            )
        ]


seo_analyzer = SEOAnalyzer()


def analyze(page: ScrapedPage) -> list[SEOIssue]:
    """Backward-compatible convenience wrapper."""

    return seo_analyzer.analyze(page)
