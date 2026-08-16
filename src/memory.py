import os
from dotenv import load_dotenv
from psycopg import Connection
from langgraph.store.postgres import PostgresStore
from psycopg.rows import dict_row

load_dotenv()

POSTGRES_URI = os.getenv("POSTGRES_URI")

if not POSTGRES_URI:
    raise ValueError("POSTGRES_URI was not found in .env")

# Open PostgreSQL connection
_connection = Connection.connect(
    POSTGRES_URI,
    autocommit=True,
    row_factory=dict_row
)

# Create persistent long-term memory store
memory_store = PostgresStore(_connection)

# Create/update the required LangGraph tables
memory_store.setup()

def get_memory_store():
    return memory_store

def close_memory_store():
    _connection.close()