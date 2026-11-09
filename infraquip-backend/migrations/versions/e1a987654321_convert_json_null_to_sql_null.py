"""Convert JSON null to SQL NULL in term sheet columns

Revision ID: e1a987654321
Revises: d8b920145e23
Create Date: 2026-11-09 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'e1a987654321'
down_revision: Union[str, None] = 'd8b920145e23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE machines SET rental_term_sheet = NULL WHERE rental_term_sheet = 'null'::jsonb;")
    op.execute("UPDATE machines SET sale_term_sheet = NULL WHERE sale_term_sheet = 'null'::jsonb;")


def downgrade() -> None:
    # No-op since converting SQL NULL back to JSON 'null' is unnecessary and lossy
    pass

