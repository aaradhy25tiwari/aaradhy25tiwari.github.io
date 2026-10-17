import sys
sys.path.insert(0, ".")
import asyncio
from sqlalchemy import text
from app.database import engine

async def add_is_negotiable():
    async with engine.begin() as conn:
        print("Adding is_negotiable column to machines table if not exists...")
        await conn.execute(text("ALTER TABLE machines ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN NOT NULL DEFAULT FALSE;"))
        res = await conn.execute(text("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'machines' AND column_name = 'is_negotiable';
        """))
        row = res.fetchone()
        print("is_negotiable column status:", row)

if __name__ == "__main__":
    asyncio.run(add_is_negotiable())
