"""
Google Analytics 4 Data API service (UC-012).

One-time setup (done once by the developer / deployment owner):
  1. Go to https://console.cloud.google.com/ and create (or pick) a project.
  2. Enable the "Google Analytics Data API" for that project.
  3. Create a Service Account (IAM & Admin -> Service Accounts), then create
     and download a JSON key for it.
  4. Set GA4_SERVICE_ACCOUNT_FILE in backend/.env to the path of that JSON file.

Per-website setup (each end user does this once per audited site):
  1. In Google Analytics, open Admin -> Property Access Management for the
     GA4 property of the website being audited.
  2. Add the service account's email (see `service_account_email` below, or
     the "client_email" field inside the JSON key) as a "Viewer".
  3. Copy the GA4 Property ID (Admin -> Property Settings, a number such as
     "123456789") and paste it into the project's analytics page.

After that, the project just needs the Property ID — no OAuth flow for users.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

GA4_SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
HISTORY_DAYS = 28


class GA4ServiceError(RuntimeError):
    """Raised when the GA4 Data API cannot be queried."""


class GA4PermissionError(GA4ServiceError):
    """Raised when the service account lacks Viewer access to the property."""


class GA4NotFoundError(GA4ServiceError):
    """Raised when the GA4 property ID does not exist or is unreachable."""


@dataclass(slots=True)
class GA4Service:
    """Thin wrapper around the GA4 Data API using a service account."""

    credentials_file: str = field(
        default_factory=lambda: settings.GA4_SERVICE_ACCOUNT_FILE.strip()
    )
    _client: Any = field(default=None, init=False, repr=False)
    _service_account_email: str | None = field(default=None, init=False, repr=False)

    @property
    def is_configured(self) -> bool:
        return bool(self.credentials_file) and Path(self.credentials_file).is_file()

    @property
    def service_account_email(self) -> str | None:
        """Return the service account's client_email, for setup instructions."""
        if self._service_account_email is not None:
            return self._service_account_email
        if not self.is_configured:
            return None
        try:
            data = json.loads(Path(self.credentials_file).read_text(encoding="utf-8"))
            self._service_account_email = data.get("client_email")
        except Exception:
            logger.exception("Failed to read GA4 service account file")
            return None
        return self._service_account_email

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client
        if not self.is_configured:
            raise GA4ServiceError(
                "GA4_SERVICE_ACCOUNT_FILE is not configured or the file does not exist."
            )

        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.oauth2 import service_account

        credentials = service_account.Credentials.from_service_account_file(
            self.credentials_file, scopes=GA4_SCOPES
        )
        self._client = BetaAnalyticsDataClient(credentials=credentials)
        return self._client

    @staticmethod
    def normalize_property_id(property_id: str) -> str:
        cleaned = property_id.strip().removeprefix("properties/")
        if not cleaned.isdigit():
            raise ValueError("GA4 Property ID must be numeric, e.g. 123456789.")
        return cleaned

    async def get_summary(self, property_id: str) -> dict:
        """Fetch a 28-day summary for the given GA4 property."""
        cleaned = self.normalize_property_id(property_id)
        return await asyncio.to_thread(self._fetch_summary, cleaned)

    def _fetch_summary(self, property_id: str) -> dict:
        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Metric,
            OrderBy,
            RunReportRequest,
        )
        from google.api_core.exceptions import GoogleAPIError, NotFound, PermissionDenied

        client = self._get_client()
        property_path = f"properties/{property_id}"
        date_range = DateRange(start_date=f"{HISTORY_DAYS}daysAgo", end_date="today")

        try:
            totals = client.run_report(
                RunReportRequest(
                    property=property_path,
                    date_ranges=[date_range],
                    metrics=[
                        Metric(name="sessions"),
                        Metric(name="activeUsers"),
                        Metric(name="newUsers"),
                        Metric(name="screenPageViews"),
                        Metric(name="bounceRate"),
                        Metric(name="averageSessionDuration"),
                    ],
                )
            )

            daily = client.run_report(
                RunReportRequest(
                    property=property_path,
                    date_ranges=[date_range],
                    dimensions=[Dimension(name="date")],
                    metrics=[
                        Metric(name="sessions"),
                        Metric(name="activeUsers"),
                        Metric(name="screenPageViews"),
                    ],
                    order_bys=[
                        OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))
                    ],
                )
            )

            top_pages = client.run_report(
                RunReportRequest(
                    property=property_path,
                    date_ranges=[date_range],
                    dimensions=[Dimension(name="pagePath")],
                    metrics=[Metric(name="screenPageViews")],
                    order_bys=[
                        OrderBy(
                            metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"),
                            desc=True,
                        )
                    ],
                    limit=10,
                )
            )

            channels = client.run_report(
                RunReportRequest(
                    property=property_path,
                    date_ranges=[date_range],
                    dimensions=[Dimension(name="sessionDefaultChannelGroup")],
                    metrics=[Metric(name="sessions")],
                    order_bys=[
                        OrderBy(
                            metric=OrderBy.MetricOrderBy(metric_name="sessions"),
                            desc=True,
                        )
                    ],
                )
            )
        except PermissionDenied as exc:
            email = self.service_account_email or "the service account"
            raise GA4PermissionError(
                f"Google Analytics denied access to property {property_id}. "
                f"Add {email} as a Viewer in GA4 Admin -> Property Access Management, "
                "then try again."
            ) from exc
        except NotFound as exc:
            raise GA4NotFoundError(f"GA4 property '{property_id}' was not found.") from exc
        except GoogleAPIError as exc:
            raise GA4ServiceError(f"Google Analytics Data API request failed: {exc}") from exc

        totals_row = totals.rows[0] if totals.rows else None

        def _metric(row: Any, idx: int) -> float:
            return float(row.metric_values[idx].value) if row else 0.0

        history = [
            {
                "date": row.dimension_values[0].value,
                "sessions": int(float(row.metric_values[0].value)),
                "active_users": int(float(row.metric_values[1].value)),
                "page_views": int(float(row.metric_values[2].value)),
            }
            for row in daily.rows
        ]

        top_pages_list = [
            {
                "page_path": row.dimension_values[0].value,
                "views": int(float(row.metric_values[0].value)),
            }
            for row in top_pages.rows
        ]

        channels_list = [
            {
                "channel": row.dimension_values[0].value,
                "sessions": int(float(row.metric_values[0].value)),
            }
            for row in channels.rows
        ]

        return {
            "property_id": property_id,
            "period_days": HISTORY_DAYS,
            "total_sessions": int(_metric(totals_row, 0)),
            "total_active_users": int(_metric(totals_row, 1)),
            "total_new_users": int(_metric(totals_row, 2)),
            "total_page_views": int(_metric(totals_row, 3)),
            "average_bounce_rate": round(_metric(totals_row, 4) * 100, 2),
            "average_session_duration": round(_metric(totals_row, 5), 1),
            "history": history,
            "top_pages": top_pages_list,
            "channels": channels_list,
        }


ga4_service = GA4Service()
