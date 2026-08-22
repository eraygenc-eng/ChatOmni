FROM python:3.11-slim

# Prevent Python from creating .pyc files
ENV PYTHONDONTWRITEBYTECODE=1

# Send Python output directly to the terminal without buffering
ENV PYTHONUNBUFFERED=1

# Disable pip package cache to reduce image size
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install git for the RAG package
# and Docker CLI for the code execution sandbox
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependency list first
# so Docker can reuse this layer when source code changes
COPY requirements.txt .

# Upgrade pip
RUN python -m pip install --upgrade pip

# Install ChatOmni backend dependencies
RUN pip install -r requirements.txt

# Install the reusable RAG PDF Assistant package from GitHub
# Its dependencies are already managed by requirements.txt
RUN pip install --no-deps \
    "git+https://github.com/eraygenc-eng/rag-pdf-assistant.git"

# Copy ChatOmni backend source code
COPY . .

# Create persistent runtime directories
RUN mkdir -p \
    uploads \
    uploads/images \
    uploads/code \
    uploads/generated \
    projects_data

# FastAPI port
EXPOSE 8000

# Start FastAPI
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]