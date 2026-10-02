FROM python:3.12-slim
WORKDIR /app
COPY server/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --uid 10001 --create-home player && mkdir /data && chown player:player /data
COPY server/app.py ./app.py
USER player
ENV PORT=8770 BARA_DB=/data/kingdom.sqlite3
VOLUME ["/data"]
EXPOSE 8770
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-8770} --workers 2 --timeout 30 'app:create_app()'"]
