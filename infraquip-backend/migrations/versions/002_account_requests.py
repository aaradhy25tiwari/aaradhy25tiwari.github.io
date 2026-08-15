"""002_account_requests

Revision ID: 002
Revises: 001
Create Date: 2026-07-29

- Adds account_requests table (gated registration queue)
- Adds must_change_password column to users
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM


# revision identifiers
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Enums ──────────────────────────────────────────────────
    account_request_status = sa.Enum(
        "pending", "approved", "rejected",
        name="accountrequeststatus"
    )
    account_request_role = sa.Enum(
        "vendor", "customer",
        name="account_request_role_enum"
    )
    account_request_status.create(op.get_bind(), checkfirst=True)
    account_request_role.create(op.get_bind(), checkfirst=True)

    # ── account_requests table ─────────────────────────────────
    op.create_table(
        "account_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
sa.Column(
                "role",
                ENUM("vendor", "customer", name="account_request_role_enum", create_type=False),
                nullable=False,
                server_default="customer",
            ),
        sa.Column("company_name", sa.String(300), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("gstin_pan", sa.String(30), nullable=True),
        sa.Column("message", sa.Text, nullable=True),
sa.Column(
                "status",
                ENUM("pending", "approved", "rejected", name="accountrequeststatus", create_type=False),
                nullable=False,
                server_default="pending",
            ),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("supabase_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "reviewed_by",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("email", name="uq_account_requests_email"),
    )
    op.create_index("ix_account_requests_email", "account_requests", ["email"])
    op.create_index("ix_account_requests_status", "account_requests", ["status"])

    # ── Add must_change_password to users ──────────────────────
    op.add_column(
        "users",
        sa.Column("must_change_password", sa.Boolean, nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("users", "must_change_password")
    op.drop_index("ix_account_requests_status", table_name="account_requests")
    op.drop_index("ix_account_requests_email", table_name="account_requests")
    op.drop_table("account_requests")
    sa.Enum(name="accountrequeststatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="account_request_role_enum").drop(op.get_bind(), checkfirst=True)
