# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile for PAVS Backend API
# Serves the FastAPI SPARQL search API for the PAVS frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# ── Python dependencies ───────────────────────────────────────────────────────
# Install dependencies from requirements.txt
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────────
COPY backend/ ./backend/

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
