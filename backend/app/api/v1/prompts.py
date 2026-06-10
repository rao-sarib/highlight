"""
Prompt optimization endpoint for UC-004.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.dependencies import get_current_user
from app.models.user import User
from app.services.llm_service import llm_service

router = APIRouter(prefix="/prompts", tags=["Prompt Optimization"])


class PromptOptimizationRequest(BaseModel):
    keyword: str = Field(min_length=2, max_length=255)


class PromptOptimizationResponse(BaseModel):
    keyword: str
    prompts: list[str]


@router.post("/optimize", response_model=PromptOptimizationResponse, summary="Optimize prompts")
async def optimize_prompts(
    body: PromptOptimizationRequest,
    _current_user: User = Depends(get_current_user),
) -> PromptOptimizationResponse:
    prompts = await llm_service.optimize_prompts(body.keyword)
    return PromptOptimizationResponse(keyword=body.keyword.strip(), prompts=prompts)
