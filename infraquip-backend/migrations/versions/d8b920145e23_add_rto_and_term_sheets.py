"""Add RTO registration fields and detailed term sheets

Revision ID: d8b920145e23
Revises: c7a819034d12
Create Date: 2026-11-08 16:47:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'd8b920145e23'
down_revision: Union[str, None] = 'c7a819034d12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_rto_registered BOOLEAN DEFAULT FALSE NOT NULL;")
    op.execute("ALTER TABLE machines ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50);")
    op.execute("ALTER TABLE machines ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100);")
    op.execute("ALTER TABLE machines ADD COLUMN IF NOT EXISTS machine_serial_no VARCHAR(100);")
    op.execute("ALTER TABLE machines ADD COLUMN IF NOT EXISTS serial_plate_photo_url TEXT;")
    op.execute("ALTER TABLE machines ADD COLUMN IF NOT EXISTS rental_term_sheet JSONB;")
    op.execute("ALTER TABLE machines ADD COLUMN IF NOT EXISTS sale_term_sheet JSONB;")
    op.execute("ALTER TABLE machines ADD COLUMN IF NOT EXISTS has_custom_terms BOOLEAN DEFAULT FALSE NOT NULL;")
    op.execute("CREATE INDEX IF NOT EXISTS idx_machines_rto ON machines (is_rto_registered);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_machines_rto;")
    op.drop_column('machines', 'has_custom_terms')
    op.drop_column('machines', 'sale_term_sheet')
    op.drop_column('machines', 'rental_term_sheet')
    op.drop_column('machines', 'serial_plate_photo_url')
    op.drop_column('machines', 'machine_serial_no')
    op.drop_column('machines', 'chassis_number')
    op.drop_column('machines', 'registration_number')
    op.drop_column('machines', 'is_rto_registered')

