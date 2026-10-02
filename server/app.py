"""Privy-authenticated cloud saves for the solo Benteng Bara campaign.

Run locally with Python; deploy with Gunicorn behind an HTTPS reverse proxy.
The database must live on a persistent disk outside the public website directory.
"""
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import sqlite3
import threading
import time
from wsgiref.simple_server import make_server

import jwt

RESOURCES = ("wood", "stone", "gold", "meat")
UNITS = ("soldier", "archer", "cavalry")
LEVELS = {"barracks": (0, 3, 10), "tower": (0, 3, 12), "wall": (0, 3, 13),
          "townhall": (1, 3, 18), "lumber": (1, 4, 8), "quarry": (1, 4, 8),
          "mine": (1, 4, 9), "hunt": (1, 4, 8)}
TRAINING = {"soldier": 5, "archer": 8, "cavalry": 12}
MAX_BODY = 49152


def number(value, low, high):
    return type(value) in (int, float) and math.isfinite(value) and low <= value <= high


def integer(value, low, high):
    return type(value) is int and low <= value <= high


def validate_save(save):
    """Bound all gameplay fields before storing a solo campaign snapshot."""
    if not isinstance(save, dict) or save.get("version") != 2 or not isinstance(save.get("state"), dict):
        raise ValueError("Invalid save version")
    s = save["state"]
    if not number(s.get("time"), 0, 1e8):
        raise ValueError("Invalid time")
    levels = s.get("levels", {})
    if not isinstance(levels, dict) or set(levels) != set(LEVELS):
        raise ValueError("Invalid buildings")
    for key, (low, high, _) in LEVELS.items():
        if not integer(levels[key], low, high):
            raise ValueError("Invalid building level")
    cap = 500 + (levels["townhall"] - 1) * 200
    pop = 8 + (levels["townhall"] - 1) * 4
    army_cap = 16 + (levels["townhall"] - 1) * 4
    hp = 240 + (levels["townhall"] - 1) * 30 + levels["wall"] * 80
    for field in ("resources", "workers", "army"):
        if not isinstance(s.get(field), dict):
            raise ValueError("Invalid counters")
    for key in RESOURCES:
        if not number(s["resources"].get(key), 0, cap) or not integer(s["workers"].get(key), 0, pop):
            raise ValueError("Invalid resources")
    if sum(s["workers"][key] for key in RESOURCES) > pop:
        raise ValueError("Too many workers")
    def valid_army(army):
        return isinstance(army, dict) and all(integer(army.get(key), 0, army_cap) for key in UNITS)
    if not valid_army(s["army"]) or not number(s.get("hp"), 0, hp):
        raise ValueError("Invalid army or HP")
    if not isinstance(s.get("captured"), list) or len(s["captured"]) != 3 or any(type(v) is not bool for v in s["captured"]):
        raise ValueError("Invalid conquests")
    if not integer(s.get("wave"), 0, 1000000) or not number(s.get("raidTimer"), 0, 150) or s.get("result") not in (None, "won", "lost"):
        raise ValueError("Invalid battle")
    for field in ("construction", "training", "expedition", "raid"):
        if field not in s:
            raise ValueError("Missing task")
    job = s["construction"]
    if job is not None:
        if not isinstance(job, dict) or job.get("key") not in LEVELS:
            raise ValueError("Invalid construction")
        key = job["key"]
        total = LEVELS[key][2] + levels[key] * 3
        if levels[key] >= LEVELS[key][1] or job.get("total") != total or not number(job.get("left"), .000000001, total):
            raise ValueError("Invalid construction time")
    jobs = s["training"]
    if not isinstance(jobs, list) or len(jobs) > 5:
        raise ValueError("Invalid training queue")
    for job in jobs:
        if not isinstance(job, dict) or job.get("key") not in TRAINING or not number(job.get("left"), .000000001, TRAINING[job["key"]]):
            raise ValueError("Invalid training")
    mission = s["expedition"]
    deployed = 0
    if mission is not None:
        if not isinstance(mission, dict) or not integer(mission.get("camp"), 0, 2) or not valid_army(mission.get("troops")):
            raise ValueError("Invalid expedition")
        if not number(mission.get("elapsed"), 0, 29.999999999) or not number(mission.get("power"), 0, army_cap * 18):
            raise ValueError("Invalid expedition progress")
        if type(mission.get("resolved")) is not bool or type(mission.get("won")) is not bool:
            raise ValueError("Invalid expedition result")
        deployed = sum(mission["troops"][key] for key in UNITS)
    if sum(s["army"][key] for key in UNITS) + deployed + len(jobs) > army_cap:
        raise ValueError("Army capacity exceeded")
    raid = s["raid"]
    if raid is not None and (not isinstance(raid, dict) or not number(raid.get("left"), .000000001, 8) or raid.get("power") != 34 + s["wave"] * 16):
        raise ValueError("Invalid raid")
    # Whitelist stored fields; personal data and unexpected client fields are discarded.
    clean = {key: s[key] for key in ("time", "levels", "hp", "captured", "wave", "raidTimer", "result")}
    for field, keys in (("resources", RESOURCES), ("workers", RESOURCES), ("army", UNITS)):
        clean[field] = {key: s[field][key] for key in keys}
    clean["construction"] = {key: s["construction"][key] for key in ("key", "left", "total")} if s["construction"] else None
    clean["training"] = [{key: task[key] for key in ("key", "left")} for task in s["training"]]
    clean["expedition"] = {key: mission[key] for key in ("camp", "elapsed", "resolved", "power", "won")} if mission else None
    if mission:
        clean["expedition"]["troops"] = {key: mission["troops"][key] for key in UNITS}
    clean["raid"] = {key: raid[key] for key in ("left", "power")} if raid else None
    entries = s.get("log", [])
    clean["log"] = [{"time": e["time"], "text": e["text"][:180]} for e in entries[:8] if isinstance(e, dict) and number(e.get("time"), 0, 1e8) and isinstance(e.get("text"), str)] if isinstance(entries, list) else []
    return {"version": 2, "state": clean}


class Store:
    def __init__(self, filename):
        self.filename = str(filename)
        Path(filename).parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.execute("CREATE TABLE IF NOT EXISTS saves (user_id TEXT PRIMARY KEY, save TEXT NOT NULL, revision INTEGER NOT NULL, saved_at TEXT NOT NULL)")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.filename, timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    def get(self, user_id):
        with self.connect() as db:
            row = db.execute("SELECT save, revision, saved_at FROM saves WHERE user_id=?", (user_id,)).fetchone()
        return {"userId": user_id, "save": json.loads(row[0]) if row else None, "revision": row[1] if row else 0, "savedAt": row[2] if row else None}

    def put(self, user_id, save, revision):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            current = db.execute("SELECT revision FROM saves WHERE user_id=?", (user_id,)).fetchone()
            if (current[0] if current else 0) != revision:
                return None
            saved_at = datetime.now(timezone.utc).isoformat()
            db.execute("INSERT INTO saves VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET save=excluded.save, revision=excluded.revision, saved_at=excluded.saved_at", (user_id, json.dumps(save, allow_nan=False), revision + 1, saved_at))
        return {"userId": user_id, "revision": revision + 1, "savedAt": saved_at}


class CloudApp:
    def __init__(self, app_id, verification_key, database, origins):
        self.app_id = app_id
        self.key = verification_key.replace('\\n', '\n')
        self.origins = set(origins)
        self.store = Store(database)
        self.requests = {}
        self.lock = threading.Lock()

    def authenticate(self, header):
        if not self.app_id or not self.key:
            raise RuntimeError("Authentication is not configured")
        if not header.startswith("Bearer ") or len(header) > 16384:
            raise jwt.InvalidTokenError("Missing token")
        claims = jwt.decode(header[7:], self.key, algorithms=["ES256"], audience=self.app_id, issuer="privy.io", options={"require": ["exp", "iat", "iss", "aud", "sub", "sid"]})
        uid = claims["sub"]
        if not isinstance(uid, str) or not uid.startswith("did:privy:") or len(uid) > 200:
            raise jwt.InvalidTokenError("Invalid subject")
        return uid

    def rate_allowed(self, identity):
        now = int(time.monotonic() // 60)
        with self.lock:
            if len(self.requests) > 10000:
                self.requests = {k: v for k, v in self.requests.items() if v[0] == now}
                if len(self.requests) > 10000:
                    return False
            period, count = self.requests.get(identity, (now, 0))
            count = count + 1 if period == now else 1
            self.requests[identity] = (now, count)
        return count <= 120

    def __call__(self, environ, start_response):
        origin = environ.get("HTTP_ORIGIN", "")
        method = environ["REQUEST_METHOD"]
        headers = [("Content-Type", "application/json; charset=utf-8"), ("Cache-Control", "no-store"), ("X-Content-Type-Options", "nosniff"), ("Vary", "Origin")]
        if origin in self.origins:
            headers.append(("Access-Control-Allow-Origin", origin))
        def reply(code, data):
            body = json.dumps(data, allow_nan=False).encode()
            names = {200: "OK", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 409: "Conflict", 413: "Content Too Large", 429: "Too Many Requests", 500: "Internal Server Error", 503: "Service Unavailable"}
            start_response(f"{code} {names[code]}", headers + [("Content-Length", str(len(body)))])
            return [body]
        if origin and origin not in self.origins:
            return reply(403, {"error": "origin_not_allowed"})
        if environ.get("PATH_INFO") == "/health" and method == "GET":
            return reply(200, {"ok": True, "authConfigured": bool(self.app_id and self.key)})
        if environ.get("PATH_INFO") != "/api/save":
            return reply(404, {"error": "not_found"})
        if method == "OPTIONS":
            headers.extend([("Access-Control-Allow-Methods", "GET, PUT, OPTIONS"), ("Access-Control-Allow-Headers", "Authorization, Content-Type"), ("Access-Control-Max-Age", "600")])
            return reply(200, {})
        if method not in ("GET", "PUT"):
            return reply(405, {"error": "method_not_allowed"})
        if not self.rate_allowed(environ.get("REMOTE_ADDR", "unknown")):
            return reply(429, {"error": "rate_limit"})
        try:
            uid = self.authenticate(environ.get("HTTP_AUTHORIZATION", ""))
        except RuntimeError:
            return reply(503, {"error": "auth_not_configured"})
        except (jwt.InvalidTokenError, ValueError, TypeError):
            return reply(401, {"error": "invalid_token"})
        try:
            if method == "GET":
                return reply(200, self.store.get(uid))
            length = int(environ.get("CONTENT_LENGTH") or "0")
            if length > MAX_BODY:
                return reply(413, {"error": "save_too_large"})
            if length <= 0 or not environ.get("CONTENT_TYPE", "").startswith("application/json"):
                return reply(400, {"error": "invalid_body"})
            payload = json.loads(environ["wsgi.input"].read(length))
            if not isinstance(payload, dict) or not integer(payload.get("revision"), 0, 2**53 - 1):
                return reply(400, {"error": "invalid_revision"})
            save = validate_save(payload.get("save"))
            result = self.store.put(uid, save, payload["revision"])
            return reply(200, result) if result else reply(409, {"error": "save_conflict"})
        except (ValueError, TypeError, KeyError, OverflowError):
            return reply(400, {"error": "invalid_save"})
        except sqlite3.Error:
            return reply(503, {"error": "storage_unavailable"})


def create_app():
    return CloudApp(os.getenv("PRIVY_APP_ID", ""), os.getenv("PRIVY_VERIFICATION_KEY", ""), os.getenv("BARA_DB", "/data/kingdom.sqlite3"), os.getenv("BARA_ALLOWED_ORIGINS", "https://6xg.online").split(","))


if __name__ == "__main__":
    server = make_server("127.0.0.1", int(os.getenv("PORT", "8770")), create_app())
    print("Benteng Bara account API on http://127.0.0.1:8770", flush=True)
    server.serve_forever()
