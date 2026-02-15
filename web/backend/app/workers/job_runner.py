"""Background job runner for generation pipeline tasks."""

from __future__ import annotations

import asyncio
import shutil
import tempfile
from datetime import datetime, timezone

import structlog

from app.services.encryption import decrypt_api_key
from app.services.storage import generate_thumbnail, get_signed_url, upload_bytes, upload_file
from app.services.supabase_client import get_supabase

logger = structlog.get_logger()

# Limits concurrent pipeline runs to prevent API rate limit exhaustion
_semaphore: asyncio.Semaphore | None = None


def _get_semaphore(max_concurrent: int = 3) -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(max_concurrent)
    return _semaphore


def _update_generation(job_id: str, **fields) -> None:
    """Update a generation row in Supabase."""
    sb = get_supabase()
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    sb.table("generations").update(fields).eq("id", job_id).execute()


async def run_generation_job(
    job_id: str,
    user_id: str,
    source_context: str,
    communicative_intent: str,
    diagram_type: str,
    refinement_iterations: int,
    raw_data: dict | None,
    max_concurrent: int = 3,
) -> None:
    """Run the PaperBanana pipeline as a background task."""
    sem = _get_semaphore(max_concurrent)

    async with sem:
        try:
            _update_generation(
                job_id,
                status="running",
                progress="Initializing pipeline...",
                started_at=datetime.now(timezone.utc).isoformat(),
            )

            # Get the user's encrypted API key
            sb = get_supabase()
            profile = (
                sb.table("profiles")
                .select("gemini_api_key_encrypted")
                .eq("id", user_id)
                .single()
                .execute()
            )
            encrypted_key = profile.data.get("gemini_api_key_encrypted")
            if not encrypted_key:
                _update_generation(job_id, status="failed", error_message="No Gemini API key configured")
                return

            api_key = decrypt_api_key(encrypted_key)

            # Create a temporary output directory for this job
            tmp_dir = tempfile.mkdtemp(prefix=f"pb_job_{job_id}_")

            try:
                # Import here to avoid loading the full pipeline at module level
                from paperbanana.core.config import Settings
                from paperbanana.core.pipeline import PaperBananaPipeline
                from paperbanana.core.types import DiagramType, GenerationInput

                _update_generation(job_id, progress="Phase 1: Planning diagram...")

                pb_settings = Settings(
                    google_api_key=api_key,
                    refinement_iterations=refinement_iterations,
                    output_dir=tmp_dir,
                )

                pipeline = PaperBananaPipeline(settings=pb_settings)

                gen_input = GenerationInput(
                    source_context=source_context,
                    communicative_intent=communicative_intent,
                    diagram_type=DiagramType(diagram_type),
                    raw_data=raw_data,
                )

                _update_generation(job_id, progress="Phase 2: Generating and refining image...")
                result = await pipeline.generate(gen_input)

                # Upload final image to Supabase Storage
                image_storage_path = f"{user_id}/{job_id}/final.png"
                upload_file("generations", image_storage_path, result.image_path)

                # Generate and upload thumbnail
                thumb_bytes = generate_thumbnail(result.image_path, max_width=400)
                thumb_storage_path = f"{user_id}/{job_id}/thumbnail.png"
                upload_bytes("generations", thumb_storage_path, thumb_bytes, "image/png")

                # Get signed URLs
                image_url = get_signed_url("generations", image_storage_path)
                thumb_url = get_signed_url("generations", thumb_storage_path)

                # Serialize iterations (strip local file paths)
                iterations_data = []
                for it in result.iterations:
                    it_dict = it.model_dump()
                    it_dict.pop("image_path", None)
                    iterations_data.append(it_dict)

                _update_generation(
                    job_id,
                    status="completed",
                    progress="Done",
                    image_storage_path=image_storage_path,
                    image_url=image_url,
                    thumbnail_storage_path=thumb_storage_path,
                    description=result.description,
                    run_metadata=result.metadata,
                    iterations=iterations_data,
                    completed_at=datetime.now(timezone.utc).isoformat(),
                )

                logger.info("Generation job completed", job_id=job_id)

            finally:
                shutil.rmtree(tmp_dir, ignore_errors=True)

        except Exception as e:
            logger.error("Generation job failed", job_id=job_id, error=str(e))
            _update_generation(
                job_id,
                status="failed",
                error_message=str(e),
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
