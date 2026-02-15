"""Supabase Storage helpers for uploading and retrieving files."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image

from app.services.supabase_client import get_supabase


def upload_file(bucket: str, storage_path: str, local_path: str) -> None:
    """Upload a local file to Supabase Storage."""
    sb = get_supabase()
    with open(local_path, "rb") as f:
        data = f.read()
    sb.storage.from_(bucket).upload(
        storage_path, data, file_options={"content-type": _content_type(local_path)}
    )


def upload_bytes(bucket: str, storage_path: str, data: bytes, content_type: str) -> None:
    """Upload raw bytes to Supabase Storage."""
    sb = get_supabase()
    sb.storage.from_(bucket).upload(
        storage_path, data, file_options={"content-type": content_type}
    )


def get_signed_url(bucket: str, storage_path: str, expires_in: int = 3600) -> str:
    """Get a signed URL for a private file (default 1 hour)."""
    sb = get_supabase()
    result = sb.storage.from_(bucket).create_signed_url(storage_path, expires_in)
    return result["signedURL"]


def generate_thumbnail(local_path: str, max_width: int = 400) -> bytes:
    """Resize an image to thumbnail size, return PNG bytes."""
    img = Image.open(local_path)
    ratio = max_width / img.width
    new_size = (max_width, int(img.height * ratio))
    img = img.resize(new_size, Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def delete_file(bucket: str, storage_path: str) -> None:
    """Delete a file from Supabase Storage."""
    sb = get_supabase()
    sb.storage.from_(bucket).remove([storage_path])


def _content_type(path: str) -> str:
    ext = Path(path).suffix.lower()
    return {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".gif": "image/gif",
    }.get(ext, "application/octet-stream")
