"""
Alembic env.py — configured for async SQLAlchemy + our models
"""
import asyncio
from logging.config import fileConfig
from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

# Import settings and Base
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.config import settings
from app.database import Base

# Import all models so Alembic can detect them
import app.models  # noqa: F401

# Alembic Config object
config = context.config

# Interpret the alembic.ini's logging section
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata
target_metadata = Base.metadata

# Override sqlalchemy.url from settings
def get_url():
    # Use sync URL for alembic (asyncpg -> psycopg2)
    return settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations asynchronously."""
    from sqlalchemy.ext.asyncio import create_async_engine
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
        connect_args={"prepared_statement_cache_size": 0},  # pgbouncer/pooler doesn't support prepared statements
    )
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
