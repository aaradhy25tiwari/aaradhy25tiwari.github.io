"""
Auth Sync Helper — Synchronizes credentials with Supabase Auth, handles creation, reconciliation and compensation.
"""
import logging
import uuid
from typing import Any, Optional

logger = logging.getLogger(__name__)


def sync_supabase_user_password(
    supabase: Any,
    email: str,
    password: str,
    current_auth_uid: Optional[uuid.UUID] = None,
) -> tuple[uuid.UUID, bool]:
    """
    Updates the password for an existing Supabase user, or creates/reconciles one if auth_uid is missing.
    Returns (auth_uid, was_created).
    """
    email_clean = email.strip().lower()
    if current_auth_uid:
        try:
            supabase.auth.admin.update_user_by_id(
                str(current_auth_uid),
                {"password": password},
            )
            return current_auth_uid, False
        except Exception as e:
            logger.warning(
                "Failed to update user by auth_uid %s: %s. Attempting email reconciliation.",
                current_auth_uid,
                e,
            )

    # Attempt to create user
    try:
        resp = supabase.auth.admin.create_user({
            "email": email_clean,
            "password": password,
            "email_confirm": True,
        })
        return uuid.UUID(resp.user.id), True
    except Exception as create_err:
        # Reconcile existing external identity across all pages if already present in Supabase Auth
        try:
            page = 1
            per_page = 50
            while True:
                users_page = supabase.auth.admin.list_users(page=page, per_page=per_page)
                if not users_page:
                    break
                for ext_user in users_page:
                    ext_email = getattr(ext_user, "email", None)
                    if ext_email and isinstance(ext_email, str) and ext_email.strip().lower() == email_clean:
                        matched_id = uuid.UUID(str(ext_user.id))
                        supabase.auth.admin.update_user_by_id(
                            str(matched_id),
                            {"password": password},
                        )
                        return matched_id, False
                if len(users_page) < per_page:
                    break
                page += 1
        except Exception as lookup_err:
            logger.error("Failed to reconcile existing Supabase identity for %s: %s", email_clean, lookup_err)
        raise create_err
