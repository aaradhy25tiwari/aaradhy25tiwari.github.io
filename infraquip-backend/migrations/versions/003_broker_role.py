"""003_broker_role

Revision ID: 003
Revises: 002
Create Date: 2026-07-31

- Adds 'broker' value to userrole, account_request_role_enum, and planrole enums
- Creates broker_profiles table
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Extend enums to include 'broker' ───────────────────────
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'broker'")
    op.execute("ALTER TYPE account_request_role_enum ADD VALUE IF NOT EXISTS 'broker'")
    op.execute("ALTER TYPE planrole ADD VALUE IF NOT EXISTS 'broker'")

    # ── broker_profiles table ───────────────────────────────────
    op.create_table(
        "broker_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("company_name", sa.String(300), nullable=True),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("pan", sa.String(15), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "member_since",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("broker_profiles")
    # PostgreSQL cannot remove values from enum types; leaving enums extended is acceptable.
