"""add_machine_fields

Revision ID: a1e688a226d3
Revises: 003
Create Date: 2026-08-03 16:54:48.251722

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1e688a226d3'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Enums
    op.execute("CREATE TYPE machinerunningcondition AS ENUM ('running', 'not_running')")
    op.execute("CREATE TYPE machineownershiptype AS ENUM ('owner', 'dealer')")

    # 2. Add Columns
    op.add_column('machines', sa.Column('running_condition', sa.Enum('running', 'not_running', name='machinerunningcondition'), server_default='running', nullable=False))
    op.add_column('machines', sa.Column('hmr', sa.Integer(), nullable=True))
    op.add_column('machines', sa.Column('ownership_type', sa.Enum('owner', 'dealer', name='machineownershiptype'), server_default='owner', nullable=False))

    # 3. Create Indexes
    op.create_index('idx_machines_running_cond', 'machines', ['running_condition'], unique=False)
    op.create_index('idx_machines_ownership', 'machines', ['ownership_type'], unique=False)


def downgrade() -> None:
    # 1. Drop Indexes
    op.drop_index('idx_machines_ownership', table_name='machines')
    op.drop_index('idx_machines_running_cond', table_name='machines')

    # 2. Drop Columns
    op.drop_column('machines', 'ownership_type')
    op.drop_column('machines', 'hmr')
    op.drop_column('machines', 'running_condition')

    # 3. Drop Enums
    op.execute("DROP TYPE machineownershiptype")
    op.execute("DROP TYPE machinerunningcondition")
