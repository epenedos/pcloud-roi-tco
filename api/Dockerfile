FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /srv

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt \
    && playwright install --with-deps chromium \
    && useradd --create-home --uid 10001 app \
    && chown -R app:app /srv /ms-playwright

COPY --chown=app:app . .
RUN chmod +x entrypoint.sh

USER app
EXPOSE 8000
CMD ["./entrypoint.sh"]
