import os
from dotenv import load_dotenv
from psycopg import Connection
from psycopg.rows import dict_row
from langgraph.checkpoint.postgres import PostgresSaver

load_dotenv()

POSTGRES_URI = os.getenv("POSTGRES_URI")

if not POSTGRES_URI:
    raise RuntimeError("POSTGRES_URI was not found in the environment.")

# Create a persistent PostgreSQL connection
checkpoint_connection = Connection.connect(
    POSTGRES_URI,
    autocommit=True,
    prepare_threshold=0,
    row_factory=dict_row
)

# Create the LangGraph PostgreSQL checkpointer
checkpointer = PostgresSaver(checkpoint_connection)

# Create/update the required checkpoint table
checkpointer.setup()

def get_checkpointer():
    return checkpointer

def close_checkpointer():
    checkpoint_connection.close()