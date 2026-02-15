"""Custom asset (logo, brand image) endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status

from app.models.schemas import AssetListResponse, AssetResponse
from app.services.auth import get_current_user
from app.services.storage import delete_file, get_signed_url, upload_bytes
from app.services.supabase_client import get_supabase

router = APIRouter()

User = Annotated[dict, Depends(get_current_user)]

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/svg+xml"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def upload_asset(file: UploadFile, name: str = Form(...), user: User = Depends(get_current_user)):
    """Upload a custom asset (logo, brand image, etc.)."""
    if not file.content_type or file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_TYPES)}",
        )

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 5MB).")

    sb = get_supabase()
    user_id = user["user_id"]

    # Insert DB row first to get the ID
    row = sb.table("custom_assets").insert({
        "user_id": user_id,
        "name": name,
        "file_type": file.content_type,
        "storage_path": "",  # placeholder, updated below
    }).execute()

    asset_id = row.data[0]["id"]
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png"
    storage_path = f"{user_id}/{asset_id}.{ext}"

    # Upload to Supabase Storage
    upload_bytes("assets", storage_path, data, file.content_type)

    # Update the storage path
    sb.table("custom_assets").update({"storage_path": storage_path}).eq("id", asset_id).execute()

    thumb_url = get_signed_url("assets", storage_path)

    return AssetResponse(
        id=asset_id,
        name=name,
        file_type=file.content_type,
        thumbnail_url=thumb_url,
        created_at=row.data[0]["created_at"],
    )


@router.get("/assets", response_model=AssetListResponse)
async def list_assets(user: User):
    """List the user's custom assets."""
    sb = get_supabase()
    result = (
        sb.table("custom_assets")
        .select("*")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .execute()
    )

    items = []
    for row in result.data or []:
        thumb_url = None
        if row.get("storage_path"):
            try:
                thumb_url = get_signed_url("assets", row["storage_path"])
            except Exception:
                pass
        items.append(
            AssetResponse(
                id=row["id"],
                name=row["name"],
                file_type=row["file_type"],
                thumbnail_url=thumb_url,
                created_at=row["created_at"],
            )
        )

    return AssetListResponse(items=items)


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(asset_id: str, user: User):
    """Delete a custom asset."""
    sb = get_supabase()
    result = (
        sb.table("custom_assets")
        .select("storage_path")
        .eq("id", asset_id)
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    # Delete from storage
    if result.data.get("storage_path"):
        try:
            delete_file("assets", result.data["storage_path"])
        except Exception:
            pass

    # Delete DB row
    sb.table("custom_assets").delete().eq("id", asset_id).eq("user_id", user["user_id"]).execute()
