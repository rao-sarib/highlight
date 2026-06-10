"""
Temporal activities for scraping and SEO analysis.
"""

from __future__ import annotations

from temporalio import activity

from app.services.scraper_service import ScrapedPage, scraper_service
from app.services.seo_analyzer import seo_analyzer


@activity.defn
async def scrape_website_activity(url: str) -> dict:
    """Scrape a website and return a serializable page payload."""

    activity.logger.info("Scraping %s", url)
    page = await scraper_service.scrape_url(url)
    return page.to_dict()


@activity.defn
async def analyze_seo_activity(scraped_page: dict) -> list[dict[str, str]]:
    """Analyze a previously scraped page for on-page SEO issues."""

    page = ScrapedPage.from_dict(scraped_page)
    issues = seo_analyzer.analyze(page)
    activity.logger.info("Found %d SEO issues for %s", len(issues), page.url)
    return [issue.to_dict() for issue in issues]
