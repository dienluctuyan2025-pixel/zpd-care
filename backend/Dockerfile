FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p temp_pdfs temp_uploads

EXPOSE 8000

# Seed DB on first boot if missing (idempotent import may wipe — use start script)
CMD ["sh", "-c", "python -c \"from database import init_db; init_db()\" 2>/dev/null || true; uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
