FROM node:20-bookworm AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/app /app/backend/app
COPY --from=frontend-builder /app/dist /app/dist

RUN mkdir -p /app/backend/uploads

EXPOSE 8000

CMD ["sh", "-c", "python -m uvicorn app.main:app --app-dir /app/backend --host 0.0.0.0 --port ${PORT:-7860}"]
