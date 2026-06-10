"""
Temporal worker bootstrap for the audit workflow and Phase 2 activities.
"""

from __future__ import annotations

import asyncio
import logging
import os

from temporalio.client import Client
from temporalio.worker import UnsandboxedWorkflowRunner, Worker

# Must be imported before any SQLAlchemy mapper is configured so that
# all cross-model relationships (e.g. Project.owner → User) resolve.
import app.models.user  # noqa: F401
import app.models.project  # noqa: F401
import app.models.content  # noqa: F401
import app.models.embedding  # noqa: F401

from app.temporal.activities.ai_activities import (
    generate_project_content_activity,
    generate_seo_fixes_activity,
    index_project_content_activity,
    mark_project_audited_activity,
    optimize_prompts_activity,
)
from app.temporal.activities.scrape_activities import (
    analyze_seo_activity,
    scrape_website_activity,
)
from app.temporal.workflows.audit_workflow import AuditWorkflow

logger = logging.getLogger(__name__)

TEMPORAL_SERVER_URL = os.getenv("TEMPORAL_SERVER_URL", "localhost:7233")
TEMPORAL_NAMESPACE = os.getenv("TEMPORAL_NAMESPACE", "default")
TEMPORAL_TASK_QUEUE = os.getenv("TEMPORAL_TASK_QUEUE", "highlight-seo-task-queue")


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    logger.info(
        "Connecting Temporal worker to %s (namespace=%s, queue=%s)",
        TEMPORAL_SERVER_URL,
        TEMPORAL_NAMESPACE,
        TEMPORAL_TASK_QUEUE,
    )

    client = await Client.connect(
        TEMPORAL_SERVER_URL,
        namespace=TEMPORAL_NAMESPACE,
    )

    worker = Worker(
        client,
        task_queue=TEMPORAL_TASK_QUEUE,
        workflows=[AuditWorkflow],
        activities=[
            scrape_website_activity,
            analyze_seo_activity,
            optimize_prompts_activity,
            index_project_content_activity,
            generate_project_content_activity,
            generate_seo_fixes_activity,
            mark_project_audited_activity,
        ],
        workflow_runner=UnsandboxedWorkflowRunner(),
    )
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
