FROM python:3.11-slim

WORKDIR /app

# ffmpeg : sons joués en vocal. Pas de gcc/libpq-dev : psycopg2-binary et pillow arrivent en wheels.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/local/bin/python3 /usr/local/bin/python

# Moins de RAM : glibc garde sinon une arène mémoire par thread (une vingtaine de threads DB ici)
ENV MALLOC_ARENA_MAX=2 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python3", "bot.py"]
