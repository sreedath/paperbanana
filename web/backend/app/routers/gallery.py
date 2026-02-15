"""Gallery endpoints for browsing generation history."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models.schemas import GalleryDetailResponse, GalleryItem, GalleryListResponse
from app.services.auth import get_current_user
from app.services.storage import get_signed_url
from app.services.supabase_client import get_supabase

router = APIRouter()

User = Annotated[dict, Depends(get_current_user)]


@router.get("/gallery", response_model=GalleryListResponse)
async def list_gallery(
    user: User,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
):
    """List the user's generation history, newest first."""
    sb = get_supabase()
    user_id = user["user_id"]

    # Count total
    count_query = sb.table("generations").select("id", count="exact").eq("user_id", user_id)
    if status_filter:
        count_query = count_query.eq("status", status_filter)
    count_result = count_query.execute()
    total = count_result.count or 0

    # Fetch page
    offset = (page - 1) * per_page
    query = (
        sb.table("generations")
        .select("id, communicative_intent, diagram_type, thumbnail_storage_path, status, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + per_page - 1)
    )
    if status_filter:
        query = query.eq("status", status_filter)
    result = query.execute()

    items = []
    for row in result.data or []:
        thumb_url = None
        if row.get("thumbnail_storage_path"):
            try:
                thumb_url = get_signed_url("generations", row["thumbnail_storage_path"])
            except Exception:
                pass
        items.append(
            GalleryItem(
                id=row["id"],
                communicative_intent=row["communicative_intent"],
                diagram_type=row["diagram_type"],
                thumbnail_url=thumb_url,
                status=row["status"],
                created_at=row["created_at"],
            )
        )

    return GalleryListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/gallery/{generation_id}", response_model=GalleryDetailResponse)
async def get_generation_detail(generation_id: str, user: User):
    """Get full details of a single generation."""
    sb = get_supabase()
    result = (
        sb.table("generations")
        .select("*")
        .eq("id", generation_id)
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")

    row = result.data

    # Refresh signed URL
    image_url = None
    if row.get("image_storage_path"):
        try:
            image_url = get_signed_url("generations", row["image_storage_path"])
        except Exception:
            pass

    return GalleryDetailResponse(
        id=row["id"],
        source_context=row["source_context"],
        communicative_intent=row["communicative_intent"],
        diagram_type=row["diagram_type"],
        image_url=image_url,
        description=row.get("description"),
        iterations=row.get("iterations"),
        metadata=row.get("run_metadata"),
        status=row["status"],
        created_at=row["created_at"],
        completed_at=row.get("completed_at"),
    )
