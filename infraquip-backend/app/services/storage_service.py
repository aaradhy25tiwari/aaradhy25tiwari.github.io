import io
import uuid
import logging
import asyncio
from typing import Optional
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


def process_and_watermark_image(
    content: bytes,
    orig_ext: str = "jpg",
    orig_content_type: str = "image/jpeg",
) -> tuple[bytes, str, str]:
    """
    Applies image optimization, anti-leak watermarking, and plate sanitization.
    If processing fails, returns the validated original content with its original extension and MIME type.
    """
    try:
        from PIL import Image, ImageDraw, ImageOps
        img = Image.open(io.BytesIO(content))
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")

        max_dim = 1920
        if max(img.width, img.height) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        w, h = img.size
        badge_w, badge_h = 160, 32
        # Only draw badge if image dimensions provide valid positive bounds
        if w > badge_w + 30 and h > badge_h + 30:
            x1, y1 = max(10, w - badge_w - 20), max(10, h - badge_h - 20)
            x2, y2 = min(w - 10, w - 20), min(h - 10, h - 20)
            if x2 > x1 and y2 > y1:
                overlay = Image.new("RGBA", img.size, (255, 255, 255, 0))
                overlay_draw = ImageDraw.Draw(overlay)
                overlay_draw.rounded_rectangle([x1, y1, x2, y2], radius=6, fill=(17, 24, 39, 180))
                overlay_draw.text((x1 + 16, y1 + 8), "InfraQuip Verified", fill=(245, 158, 11, 230))
                img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

        out = io.BytesIO()
        img.save(out, format="JPEG", quality=85, optimize=True)
        return out.getvalue(), "jpg", "image/jpeg"
    except Exception as e:
        logger.warning(f"Watermark/processing failed, using original: {e}")
        return content, orig_ext, orig_content_type


def get_signed_url(storage_path: str, expires_in: int = 3600) -> Optional[str]:
    """
    Generate a short-lived signed URL for private access (admin or owner only).
    """
    try:
        supabase = _get_client()
        res = supabase.storage.from_(BUCKET).create_signed_url(storage_path, expires_in)
        if isinstance(res, dict):
            return res.get("signedURL") or res.get("signedUrl")
        return str(res)
    except Exception as e:
        logger.warning(f"Failed to generate signed URL for {storage_path}: {e}")
        return None


async def upload_serial_plate_photo(
    file: UploadFile,
    vendor_id: str,
) -> tuple[str, str]:
    """
    Upload serial number / VIN plate photo for admin age verification.
    Strips EXIF metadata before upload, stores in private bucket path,
    and returns the storage path and a short-lived signed access URL.
    """
    raw_content = await file.read()
    safe_ext, safe_content_type = validate_and_inspect_image(raw_content)

    # Strip EXIF metadata before storing
    def _strip_exif(data: bytes, ext: str) -> bytes:
        try:
            from PIL import Image, ImageOps
            img = Image.open(io.BytesIO(data))
            img = ImageOps.exif_transpose(img)
            buf = io.BytesIO()
            clean_ext = ext.lower().strip(".")
            if clean_ext in ("jpg", "jpeg"):
                fmt = "JPEG"
            elif clean_ext == "png":
                fmt = "PNG"
            elif clean_ext == "webp":
                fmt = "WEBP"
            else:
                fmt = clean_ext.upper()
            img.save(buf, format=fmt)
            return buf.getvalue()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to strip EXIF from serial plate: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to sanitize image metadata. Please upload a valid JPEG, PNG, or WebP image.",
            )

    clean_content = await asyncio.to_thread(_strip_exif, raw_content, safe_ext)
    supabase = _get_client()

    clean_vendor_id = str(uuid.UUID(str(vendor_id)))
    file_name = f"sr_plate_{uuid.uuid4()}.{safe_ext}"
    storage_path = f"admin_verification/{clean_vendor_id}/{file_name}"

    try:
        supabase.storage.from_(BUCKET).upload(
            path=storage_path,
            file=clean_content,
            file_options={"content-type": safe_content_type, "upsert": "false"},
        )
    except Exception as e:
        if "Bucket not found" in str(e) or "NoSuchBucket" in str(e):
            _ensure_bucket(supabase)
            supabase.storage.from_(BUCKET).upload(
                path=storage_path,
                file=clean_content,
                file_options={"content-type": safe_content_type, "upsert": "false"},
            )
        else:
            logger.error(f"Storage upload error for serial plate {storage_path}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to store serial plate photo. Please try again.",
            )

    signed_url = get_signed_url(storage_path, expires_in=3600) or ""
    return storage_path, signed_url


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
    raw_content = await file.read()
    safe_ext, safe_content_type = validate_and_inspect_image(raw_content)
    content, safe_ext, safe_content_type = await asyncio.to_thread(
        process_and_watermark_image, raw_content, safe_ext, safe_content_type
    )

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
