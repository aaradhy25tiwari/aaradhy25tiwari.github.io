"""Add equipment master data table

Revision ID: b5710ccdc6c7
Revises: a1e688a226d3
Create Date: 2026-08-03 18:20:28.686233

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5710ccdc6c7'
down_revision: Union[str, None] = 'a1e688a226d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


import json
import os
import uuid

def upgrade() -> None:
    # Create table
    master_table = op.create_table(
        'equipment_master_data',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('equipment_type', sa.String(length=100), nullable=False),
        sa.Column('equipment_make', sa.String(length=100), nullable=False),
        sa.Column('equipment_model', sa.String(length=200), nullable=False),
        sa.Column('capacity_text_1', sa.String(length=100), nullable=True),
        sa.Column('capacity_unit_1', sa.String(length=50), nullable=True),
        sa.Column('capacity_1', sa.Numeric(), nullable=True),
        sa.Column('capacity_1_range', sa.String(length=100), nullable=True),
        sa.Column('capacity_text_2', sa.String(length=100), nullable=True),
        sa.Column('capacity_unit_2', sa.String(length=50), nullable=True),
        sa.Column('capacity_2', sa.Numeric(), nullable=True),
        sa.Column('capacity_2_range', sa.String(length=100), nullable=True),
    )

    # Load master_data.json
    json_path = os.path.join(os.path.dirname(__file__), '..', '..', 'master_data.json')
    if os.path.exists(json_path):
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        # Prepare rows
        rows = []
        for item in data:
            def _num(val):
                if val == "": return None
                try: return float(val)
                except ValueError: return None
                
            def _str(val):
                if val == "": return None
                return str(val)

            rows.append({
                'id': uuid.uuid4(),
                'equipment_type': _str(item.get('Equipment Type')),
                'equipment_make': _str(item.get('Equipment Make')),
                'equipment_model': _str(item.get('Equipment Model')),
                'capacity_text_1': _str(item.get('Capacity Text 1')),
                'capacity_unit_1': _str(item.get('Capacity Unit 1')),
                'capacity_1': _num(item.get('Capacity 1')),
                'capacity_1_range': _str(item.get('Capacity 1 Range')),
                'capacity_text_2': _str(item.get('Capacity Text 2')),
                'capacity_unit_2': _str(item.get('Capacity Unit 2')),
                'capacity_2': _num(item.get('Capacity 2')),
                'capacity_2_range': _str(item.get('Capacity 2 Range'))
            })
        
        if rows:
            op.bulk_insert(master_table, rows)


def downgrade() -> None:
    op.drop_table('equipment_master_data')
