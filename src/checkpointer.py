import os
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
from langgraph.checkpoint.postgres import PostgresSaver

load_dotenv()

POSTGRES_URI = os.getenv("POSTGRES_URI")

if not POSTGRES_URI:
    raise RuntimeError("POSTGRES_URI was not found in the environment.")

# Create a PostgreSQL connection pool
checkpoint_pool = ConnectionPool(
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

# Create the LangGraph PostgreSQL checkpointer
checkpointer = PostgresSaver(checkpoint_pool)

# Create/update the required checkpoint table
checkpointer.setup()

def get_checkpointer():
    return checkpointer

def close_checkpointer():
    checkpoint_pool.close()