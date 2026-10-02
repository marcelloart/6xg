"""Integration checks use real ES256 signatures and an isolated temporary database."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import time
import unittest

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import jwt

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cloud_app", ROOT / "server/app.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CloudTests(unittest.TestCase):
    def setUp(self):
        scratch = ROOT.parent / "test-temp"
        scratch.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=scratch)
        self.private = ec.generate_private_key(ec.SECP256R1())
        key = self.private.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
        self.app = module.CloudApp("test-app", key, Path(self.temp.name) / "save.sqlite3", ["https://6xg.online"])
        source = "const fs=require('fs'),vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('assets/js/world-data.js','utf8')+fs.readFileSync('assets/js/engine.js','utf8')+';JSON.stringify(JSON.parse(new Kingdom().serialize()))',c);process.stdout.write(vm.runInContext('new Kingdom().serialize()',c));"
        self.save = json.loads(subprocess.check_output(["node", "-e", source], cwd=ROOT, text=True))

    def tearDown(self):
        self.assertTrue(Path(self.temp.name).resolve().is_relative_to(ROOT.parent.resolve()))
        self.temp.cleanup()

    def token(self, uid="did:privy:a", **updates):
        now = int(time.time())
        claims = {"sub": uid, "sid": "session", "iss": "privy.io", "aud": "test-app", "iat": now, "exp": now + 3600}
        claims.update(updates)
        return jwt.encode(claims, self.private, algorithm="ES256")

    def call(self, method="GET", token=None, payload=None, origin="https://6xg.online", length=None, path="/api/save"):
        data = json.dumps(payload).encode() if payload is not None else b""
        env = {"REQUEST_METHOD": method, "PATH_INFO": path, "HTTP_ORIGIN": origin, "HTTP_AUTHORIZATION": "Bearer " + token if token else "", "CONTENT_TYPE": "application/json", "CONTENT_LENGTH": str(length if length is not None else len(data)), "REMOTE_ADDR": "127.0.0.1", "wsgi.input": io.BytesIO(data)}
        result = {}
        def start(status, headers):
            result.update(status=int(status[:3]), headers=dict(headers))
        result["body"] = json.loads(b"".join(self.app(env, start)))
        return result

    def test_verified_token_can_save_and_restore_a_real_game_snapshot(self):
        token = self.token()
        self.assertEqual(self.call(token=token)["body"]["revision"], 0)
        saved = self.call("PUT", token, {"save": self.save, "revision": 0})
        self.assertEqual(saved["status"], 200)
        restored = self.call(token=token)["body"]
        self.assertEqual(restored["save"], self.save)
        self.assertEqual(restored["revision"], 1)

    def test_farm_snapshot_uses_an_independent_authenticated_store(self):
        farm = json.loads((ROOT / "tests/farm-save.json").read_text())
        token = self.token()
        self.call("PUT", token, {"save": self.save, "revision": 0})
        self.assertEqual(self.call("PUT", token, {"save": farm, "revision": 0}, path="/api/farm-save")["status"], 200)
        self.assertEqual(self.call(token=token, path="/api/farm-save")["body"]["save"], farm)
        self.assertEqual(self.call(token=token)["body"]["save"]["version"], 2)
        self.assertIsNone(self.call(token=self.token("did:privy:b"), path="/api/farm-save")["body"]["save"])

    def test_farm_deadlines_and_wrong_save_namespace_are_rejected(self):
        farm = json.loads((ROOT / "tests/farm-save.json").read_text())
        token = self.token()
        self.assertEqual(self.call("PUT", token, {"save": farm, "revision": 0})["status"], 400)
        self.assertEqual(self.call("GET", path="/api/farm-save")["status"], 401)
        farm["state"]["plots"][0] = {"id": 0, "crop": "apple", "plantedAt": farm["state"]["lastSeen"], "readyAt": farm["state"]["lastSeen"] + 300000}
        self.assertEqual(self.call("PUT", token, {"save": farm, "revision": 0}, path="/api/farm-save")["status"], 400)

    def test_another_players_progress_is_never_visible(self):
        self.call("PUT", self.token(), {"save": self.save, "revision": 0})
        other = self.call(token=self.token("did:privy:b"))["body"]
        self.assertIsNone(other["save"])
        self.assertEqual(other["revision"], 0)

    def test_stale_device_update_cannot_replace_current_progress(self):
        token = self.token()
        self.call("PUT", token, {"save": self.save, "revision": 0})
        changed = copy.deepcopy(self.save)
        changed["state"]["time"] = 200
        self.assertEqual(self.call("PUT", token, {"save": changed, "revision": 0})["status"], 409)
        self.assertEqual(self.call(token=token)["body"]["save"], self.save)

    def test_signature_expiration_issuer_audience_and_subject_are_required(self):
        for claims in ({"exp": int(time.time()) - 1}, {"iss": "evil.example"}, {"aud": "other-app"}, {"sub": "other-user"}):
            self.assertEqual(self.call(token=self.token(**claims))["status"], 401)
        other_key = ec.generate_private_key(ec.SECP256R1())
        claims = jwt.decode(self.token(), options={"verify_signature": False})
        forged = jwt.encode(claims, other_key, algorithm="ES256")
        self.assertEqual(self.call(token=forged)["status"], 401)
        self.assertEqual(self.call()["status"], 401)

    def test_invalid_or_oversized_saves_do_not_change_the_database(self):
        token = self.token()
        for bad in (-1, 99999, True, float("nan")):
            save = copy.deepcopy(self.save)
            save["state"]["resources"]["gold"] = bad
            self.assertEqual(self.call("PUT", token, {"save": save, "revision": 0})["status"], 400)
        self.assertEqual(self.call("PUT", token, {}, length=100000)["status"], 413)
        self.assertIsNone(self.call(token=token)["body"]["save"])

    def test_cors_allows_only_the_configured_game_origin(self):
        self.assertEqual(self.call(token=self.token(), origin="https://evil.example")["status"], 403)
        allowed = self.call("OPTIONS")
        self.assertEqual(allowed["headers"]["Access-Control-Allow-Origin"], "https://6xg.online")
        self.assertIn("PUT", allowed["headers"]["Access-Control-Allow-Methods"])

    def test_missing_verification_key_fails_closed(self):
        self.app.key = ""
        self.assertEqual(self.call(token=self.token())["status"], 503)

    def test_revision_and_training_capacity_are_bounded(self):
        token = self.token()
        self.assertEqual(self.call("PUT", token, {"save": self.save, "revision": True})["status"], 400)
        self.save["state"]["training"] = [{"key": "soldier", "left": 5}] * 6
        self.assertEqual(self.call("PUT", token, {"save": self.save, "revision": 0})["status"], 400)

    def test_database_survives_server_recreation(self):
        self.call("PUT", self.token(), {"save": self.save, "revision": 0})
        self.app.store = module.Store(Path(self.temp.name) / "save.sqlite3")
        self.assertEqual(self.call(token=self.token())["body"]["save"], self.save)


if __name__ == "__main__":
    unittest.main()
