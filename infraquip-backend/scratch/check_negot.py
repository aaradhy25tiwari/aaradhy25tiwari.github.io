import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath("infraquip-backend"))

from app.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'machines' AND column_name LIKE '%negot%';
        """))
        rows = res.fetchall()
        print('Matching columns:', rows)

if __name__ == '__main__':
    asyncio.run(check())
