"""Add hourly rate and min duration 1_hour

Revision ID: c7a819034d12
Revises: b5710ccdc6c7
Create Date: 2026-09-06 21:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7a819034d12'
down_revision: Union[str, None] = 'b5710ccdc6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add rental_price_hourly to machines
    op.execute("ALTER TABLE machines ADD COLUMN IF NOT EXISTS rental_price_hourly NUMERIC(12, 2);")
    try:
        op.execute("ALTER TYPE minrentalduration ADD VALUE IF NOT EXISTS '1_hour';")
    except Exception:
        pass


def downgrade() -> None:
    op.drop_column('machines', 'rental_price_hourly')
