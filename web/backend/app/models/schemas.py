"""Pydantic request/response schemas for the API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Generation ───────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    source_context: str = Field(min_length=1)
    communicative_intent: str = Field(min_length=1)
    diagram_type: str = Field(default="methodology")
    raw_data: Optional[dict[str, Any]] = None
    refinement_iterations: int = Field(default=3, ge=1, le=5)
    asset_ids: list[str] = Field(default_factory=list)


class GenerateResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ── Gallery ──────────────────────────────────────────────────────
class GalleryItem(BaseModel):
    id: str
    communicative_intent: str
    diagram_type: str
    thumbnail_url: Optional[str] = None
    status: str
    created_at: datetime


class GalleryListResponse(BaseModel):
    items: list[GalleryItem]
    total: int
    page: int
    per_page: int


class GalleryDetailResponse(BaseModel):
    id: str
    source_context: str
    communicative_intent: str
    diagram_type: str
    image_url: Optional[str] = None
    description: Optional[str] = None
    iterations: Optional[list[dict[str, Any]]] = None
    metadata: Optional[dict[str, Any]] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None


# ── Assets ───────────────────────────────────────────────────────
class AssetResponse(BaseModel):
    id: str
    name: str
    file_type: str
    thumbnail_url: Optional[str] = None
    created_at: datetime


class AssetListResponse(BaseModel):
    items: list[AssetResponse]


# ── API Key ──────────────────────────────────────────────────────
class ApiKeyRequest(BaseModel):
    gemini_api_key: str = Field(min_length=1)


class ApiKeyStatusResponse(BaseModel):
    has_key: bool
    key_preview: Optional[str] = None


# ── File Upload ──────────────────────────────────────────────────
class FileContentResponse(BaseModel):
    content: str
