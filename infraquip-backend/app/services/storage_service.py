import io
import uuid
import logging
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from supabase import create_client
from app.config import settings

logger = logging.getLogger(__name__)

BUCKET = "machine-images"
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


def _get_client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _ensure_bucket(supabase):
    try:
        supabase.storage.get_bucket(BUCKET)
    except Exception:
        try:
            supabase.storage.create_bucket(BUCKET, options={"public": True})
        except Exception:
            pass


def validate_and_inspect_image(content: bytes) -> tuple[str, str]:
    """
    Strictly validates image file content:
    - Enforces size limit (<= 10MB) and non-empty.
    - Inspects magic bytes (JPEG, PNG, WebP).
    - Uses PIL.Image to verify byte integrity and parse real format.
    - Returns sanitized extension (jpg, png, webp) and standard mime type.
    Rejects any executable, script, HTML, SVG, polyglot or corrupted payload.
    """
    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the maximum allowed limit of 10MB.",
        )

    # Magic byte inspection
    is_jpeg = content.startswith(b"\xff\xd8\xff")
    is_png = content.startswith(b"\x89PNG\r\n\x1a\n")
    is_webp = content.startswith(b"RIFF") and len(content) >= 12 and content[8:12] == b"WEBP"

    if not (is_jpeg or is_png or is_webp):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Invalid image format. Only authentic JPEG, PNG, and WebP images are permitted.",
        )

    # PIL Byte integrity verification
    try:
        img_buffer = io.BytesIO(content)
        with Image.open(img_buffer) as img:
            img.verify()
            img_format = (img.format or "").upper()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Corrupted or invalid image file content.",
        )

    if img_format in ("JPEG", "JPG"):
        return "jpg", "image/jpeg"
    elif img_format == "PNG":
        return "png", "image/png"
    elif img_format == "WEBP":
        return "webp", "image/webp"
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image format. Allowed: JPEG, PNG, WebP.",
        )


async def upload_machine_image(
    file: UploadFile,
    vendor_id: str,
    machine_id: str,
) -> tuple[str, str]:
    """
    Securely upload image to Supabase Storage:
    1. Read and validate binary content, magic bytes, and image structure.
    2. Discard original client filename to prevent path traversal / execution.
    3. Generate isolated random UUID path outside web root.
    4. Store with verified MIME type.
    """
    content = await file.read()
    safe_ext, safe_content_type = validate_and_inspect_image(content)

    supabase = _get_client()

    # Generate unique UUID path: vendor_id/machine_id/uuid.ext (safe from path traversal)
    clean_vendor_id = str(uuid.UUID(str(vendor_id)))
    clean_machine_id = str(uuid.UUID(str(machine_id)))
    file_name = f"{uuid.uuid4()}.{safe_ext}"
    storage_path = f"{clean_vendor_id}/{clean_machine_id}/{file_name}"

    try:
        supabase.storage.from_(BUCKET).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": safe_content_type, "upsert": "false"},
        )
    except Exception as e:
        if "Bucket not found" in str(e) or "NoSuchBucket" in str(e):
            _ensure_bucket(supabase)
            supabase.storage.from_(BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": safe_content_type, "upsert": "false"},
            )
        else:
            logger.error(f"Storage upload error for {storage_path}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to store uploaded image. Please try again.",
            )

    public_url = supabase.storage.from_(BUCKET).get_public_url(storage_path).rstrip("?")
    return storage_path, public_url


def delete_storage_file(storage_path: str) -> None:
    """Delete a file from Supabase Storage."""
    try:
        supabase = _get_client()
        supabase.storage.from_(BUCKET).remove([storage_path])
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Storage delete failed for {storage_path}: {e}")
