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
        # Reconcile existing external identity if already present in Supabase Auth
        try:
            users_list = supabase.auth.admin.list_users()
            for ext_user in (users_list or []):
                if getattr(ext_user, "email", "").strip().lower() == email_clean:
                    matched_id = uuid.UUID(ext_user.id)
                    supabase.auth.admin.update_user_by_id(
                        str(matched_id),
                        {"password": password},
                    )
                    return matched_id, False
        except Exception as lookup_err:
            logger.error("Failed to reconcile existing Supabase identity for %s: %s", email_clean, lookup_err)
        raise create_err
