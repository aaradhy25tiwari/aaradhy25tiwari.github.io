"""
Supabase Storage service — upload/delete machine images
"""
import uuid
from fastapi import UploadFile
from supabase import create_client
from app.config import settings

BUCKET = "machine-images"


def _get_client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


async def upload_machine_image(
    file: UploadFile,
    vendor_id: str,
    machine_id: str,
) -> tuple[str, str]:
    """
    Upload image to Supabase Storage.
    Returns: (storage_path, public_display_url)
    """
    supabase = _get_client()

    # Generate unique path: vendor_id/machine_id/uuid.ext
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "jpg"
    file_name = f"{uuid.uuid4()}.{ext}"
    storage_path = f"{vendor_id}/{machine_id}/{file_name}"

    content = await file.read()
    content_type = file.content_type or "image/jpeg"

    response = supabase.storage.from_(BUCKET).upload(
        path=storage_path,
        file=content,
        file_options={"content-type": content_type, "upsert": "false"},
    )

    # Build public URL
    public_url = supabase.storage.from_(BUCKET).get_public_url(storage_path)

    return storage_path, public_url


def delete_storage_file(storage_path: str) -> None:
    """Delete a file from Supabase Storage."""
    try:
        supabase = _get_client()
        supabase.storage.from_(BUCKET).remove([storage_path])
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Storage delete failed for {storage_path}: {e}")
