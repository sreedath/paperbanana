FROM python:3.12-slim

WORKDIR /app

# Install the paperbanana package from the repo root
COPY pyproject.toml README.md ./
COPY paperbanana/ ./paperbanana/
COPY prompts/ ./prompts/
COPY data/ ./data/
COPY configs/ ./configs/

# Install paperbanana + web backend dependencies
COPY web/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir . -r requirements.txt

COPY web/backend/app/ ./app/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
