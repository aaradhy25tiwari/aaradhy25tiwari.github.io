"""Add enquiry_number, duration_unit, duration_value, pincode to enquiries

Revision ID: f2b109876543
Revises: e1a987654321
Create Date: 2026-11-18 17:15:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'f2b109876543'
down_revision: Union[str, None] = 'e1a987654321'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS enquiry_number VARCHAR(50);")
    op.execute("ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(20);")
    op.execute("ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS duration_value INTEGER;")
    op.execute("ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiries_enquiry_number ON enquiries (enquiry_number);")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_enquiries_enquiry_number;")
    op.drop_column('enquiries', 'pincode')
    op.drop_column('enquiries', 'duration_value')
    op.drop_column('enquiries', 'duration_unit')
    op.drop_column('enquiries', 'enquiry_number')
