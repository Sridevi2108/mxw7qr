# Production Dockerfile for WindWise Python FastAPI Backend
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY . /app/backend/

ENV PYTHONUNBUFFERED=1
ENV CORS_ORIGINS=*
ENV PYTHONPATH=/app
EXPOSE 8000

# Run FastAPI using Uvicorn — binds to $PORT (Render) or 8000 (Docker Compose)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

