"""
Seed Equipment Master Catalog from Excel Sheet
"""
import asyncio
import uuid
import openpyxl
from sqlalchemy import text
from app.database import engine

async def seed():
    wb = openpyxl.load_workbook('../Equipment Master data Temp.xlsx')
    sheet = wb.active

    rows = []
    header = True
    for row in sheet.iter_rows(values_only=True):
        if not any(row):
            continue
        if header:
            header = False
            continue
        # row: [None, 'AIR COMPRESSOR', 'Atlas Copco', 'XA316', 'Air Production', 'CFM', 650, '600 to 650 CFM', ...]
        category_name = str(row[1]).strip() if row[1] else ""
        make = str(row[2]).strip() if row[2] else ""
        model = str(row[3]).strip() if row[3] else ""
        
        cap_parts = []
        if row[4]:
            p1 = f"{row[4]}: {row[6]} {row[5]}" if row[6] and row[5] else f"{row[4]}: {row[7]}" if row[7] else f"{row[4]}"
            cap_parts.append(p1)
        if len(row) > 8 and row[8]:
            p2 = f"{row[8]}: {row[10]} {row[9]}" if row[10] and row[9] else f"{row[8]}: {row[11]}" if row[11] else f"{row[8]}"
            cap_parts.append(p2)
        
        capacity_specs = " | ".join(cap_parts) if cap_parts else None
        if category_name and make and model:
            rows.append({
                "id": str(uuid.uuid4()),
                "category_name": category_name,
                "make": make,
                "model": model,
                "capacity_specs": capacity_specs,
            })

    async with engine.begin() as conn:
        # Create table if not exists
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS equipment_master_catalog (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                category_name VARCHAR(100) NOT NULL,
                make VARCHAR(100) NOT NULL,
                model VARCHAR(200) NOT NULL,
                capacity_specs VARCHAR(300),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_master_cat_make ON equipment_master_catalog(category_name, make)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_master_model ON equipment_master_catalog(model)"))

        # Check existing count
        count_res = await conn.execute(text("SELECT count(*) FROM equipment_master_catalog;"))
        count = count_res.scalar()
        print(f"Current count in equipment_master_catalog: {count}")

        if count == 0:
            for r in rows:
                await conn.execute(
                    text("""
                        INSERT INTO equipment_master_catalog (id, category_name, make, model, capacity_specs)
                        VALUES (:id, :category_name, :make, :model, :capacity_specs)
                    """),
                    r,
                )
            print(f"Successfully seeded {len(rows)} rows into equipment_master_catalog.")
        else:
            print("Table already has data, skipping initial seed.")

if __name__ == "__main__":
    asyncio.run(seed())
