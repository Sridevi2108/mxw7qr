# Production Dockerfile for WindWise Python FastAPI Backend
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend/ /app/backend/

# Expose FastAPI port
EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV CORS_ORIGINS=*

# Run FastAPI backend using Uvicorn
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
