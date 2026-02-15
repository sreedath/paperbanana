"""Generation and job status endpoints."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.config import settings
from app.models.schemas import (
    ApiKeyRequest,
    ApiKeyStatusResponse,
    FileContentResponse,
    GenerateRequest,
    GenerateResponse,
    JobStatusResponse,
)
from app.services.auth import get_current_user
from app.services.encryption import decrypt_api_key, encrypt_api_key, key_preview
from app.services.supabase_client import get_supabase
from app.workers.job_runner import run_generation_job

router = APIRouter()

User = Annotated[dict, Depends(get_current_user)]


# ── Generation ───────────────────────────────────────────────────
@router.post("/generate", response_model=GenerateResponse, status_code=status.HTTP_201_CREATED)
async def start_generation(req: GenerateRequest, user: User):
    """Start a diagram generation job. Returns immediately with a job_id."""
    sb = get_supabase()
    user_id = user["user_id"]

    # Check API key exists
    profile = sb.table("profiles").select("gemini_api_key_encrypted").eq("id", user_id).single().execute()
    if not profile.data.get("gemini_api_key_encrypted"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "api_key_required", "message": "Please configure your Gemini API key first."},
        )

    # Rate limiting: check generations in the last hour
    one_hour_ago = datetime.now(timezone.utc).isoformat()
    recent = (
        sb.table("generations")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", one_hour_ago)
        .execute()
    )
    if recent.count and recent.count >= settings.max_generations_per_hour:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit: max {settings.max_generations_per_hour} generations per hour.",
        )

    # Create the generation row
    row = sb.table("generations").insert({
        "user_id": user_id,
        "source_context": req.source_context,
        "communicative_intent": req.communicative_intent,
        "diagram_type": req.diagram_type,
        "refinement_iterations": req.refinement_iterations,
        "raw_data": req.raw_data,
        "status": "pending",
    }).execute()

    job_id = row.data[0]["id"]

    # Launch background task
    asyncio.create_task(
        run_generation_job(
            job_id=job_id,
            user_id=user_id,
            source_context=req.source_context,
            communicative_intent=req.communicative_intent,
            diagram_type=req.diagram_type,
            refinement_iterations=req.refinement_iterations,
            raw_data=req.raw_data,
            max_concurrent=settings.max_concurrent_jobs,
        )
    )

    return GenerateResponse(job_id=job_id, status="pending")


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, user: User):
    """Poll for the status of a generation job."""
    sb = get_supabase()
    result = (
        sb.table("generations")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    row = result.data

    # Refresh signed URLs if completed (they expire)
    image_url = row.get("image_url")
    thumbnail_url = None
    if row["status"] == "completed" and row.get("image_storage_path"):
        from app.services.storage import get_signed_url

        image_url = get_signed_url("generations", row["image_storage_path"])
        if row.get("thumbnail_storage_path"):
            thumbnail_url = get_signed_url("generations", row["thumbnail_storage_path"])

    return JobStatusResponse(
        job_id=row["id"],
        status=row["status"],
        progress=row.get("progress"),
        image_url=image_url,
        thumbnail_url=thumbnail_url,
        description=row.get("description"),
        error_message=row.get("error_message"),
        metadata=row.get("run_metadata"),
        created_at=row.get("created_at"),
        completed_at=row.get("completed_at"),
    )


# ── File Upload ──────────────────────────────────────────────────
@router.post("/upload", response_model=FileContentResponse)
async def upload_file(file: UploadFile, user: User):
    """Extract text content from an uploaded .txt or .md file."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("txt", "md"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .txt and .md files are supported.",
        )

    content = await file.read()
    if len(content) > 100_000:  # 100KB limit
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 100KB).")

    return FileContentResponse(content=content.decode("utf-8", errors="replace"))


# ── API Key Management ───────────────────────────────────────────
@router.put("/settings/api-key", response_model=ApiKeyStatusResponse)
async def save_api_key(req: ApiKeyRequest, user: User):
    """Store or update the user's Gemini API key (encrypted at rest)."""
    sb = get_supabase()
    encrypted = encrypt_api_key(req.gemini_api_key)
    sb.table("profiles").update({"gemini_api_key_encrypted": encrypted}).eq("id", user["user_id"]).execute()
    return ApiKeyStatusResponse(has_key=True, key_preview=key_preview(req.gemini_api_key))


@router.get("/settings/api-key", response_model=ApiKeyStatusResponse)
async def get_api_key_status(user: User):
    """Check if the user has an API key stored (does not return the key itself)."""
    sb = get_supabase()
    result = sb.table("profiles").select("gemini_api_key_encrypted").eq("id", user["user_id"]).single().execute()
    encrypted = result.data.get("gemini_api_key_encrypted") if result.data else None
    preview = None
    if encrypted:
        try:
            plaintext = decrypt_api_key(encrypted)
            preview = key_preview(plaintext)
        except Exception:
            preview = "****"
    return ApiKeyStatusResponse(has_key=bool(encrypted), key_preview=preview)


@router.delete("/settings/api-key", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(user: User):
    """Remove the user's stored API key."""
    sb = get_supabase()
    sb.table("profiles").update({"gemini_api_key_encrypted": None}).eq("id", user["user_id"]).execute()
