import os
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool
from langgraph.store.postgres import PostgresStore
from psycopg.rows import dict_row

load_dotenv()

POSTGRES_URI = os.getenv("POSTGRES_URI")

if not POSTGRES_URI:
    raise ValueError("POSTGRES_URI was not found in .env")

# Create a PostgreSQL connection pool
memory_pool = ConnectionPool(
    conninfo=POSTGRES_URI,
    min_size=1,
    max_size=10,
    timeout=15,
    max_lifetime=1800,
    open=True,
    check=ConnectionPool.check_connection,
    kwargs={
        "autocommit": True,
        "prepare_threshold": 0,
        "row_factory": dict_row,
    },
)

# Create persistent long-term memory store
memory_store = PostgresStore(memory_pool)

# Create/update the required LangGraph tables
memory_store.setup()

def get_memory_store():
    return memory_store

def close_memory_store():
    memory_pool.close()