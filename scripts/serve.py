"""Local dev server: static files with correct MIME types, plus POST /api/read
(same contract as the Vercel function in api/read.js). Reads GEMINI_API_KEY from
the environment or from .env.local, which is git-ignored."""
import functools
import http.server
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TYPES = ["utility", "phone", "rent", "subscription", "medical", "fine", "other"]
MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"]
PROMPT = (
    "You read one U.S. bill, statement, renewal notice or ticket.\nReturn ONLY JSON with these keys:\n"
    '{"payee": string, "type": one of ' + json.dumps(TYPES) + ', "amount": number (the total amount due now, no $),\n'
    ' "dueDate": "YYYY-MM-DD" or null, "lateFee": number or null (only if printed), "accountNumber": string or null,\n'
    ' "autopay": boolean (true only if the bill says autopay is on), "confidence": number 0-1, '
    '"summary": string (one plain sentence a stressed person can understand)}\n'
    "If a value is not printed, use null. Never guess an amount or a date. If the image is not a bill, set confidence to 0."
)


def api_key():
    key = os.environ.get("GEMINI_API_KEY")
    env_file = ROOT / ".env.local"
    if not key and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("GEMINI_API_KEY="):
                key = line.split("=", 1)[1].strip()
    return key


def read_bill(payload, key):
    body = json.dumps({
        "contents": [{"role": "user", "parts": [{"text": PROMPT}, {"inline_data": {"mime_type": payload["mimeType"], "data": payload["data"]}}]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }).encode()
    for model in MODELS:
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=body, headers={"Content-Type": "application/json", "x-goog-api-key": key}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=12) as res:
                data = json.load(res)
            text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
            start, end = text.find("{"), text.rfind("}")
            return 200, json.loads(text[start:end + 1])
        except urllib.error.HTTPError as err:
            if err.code in (404, 429, 500, 502, 503, 504):
                continue
            return 422, {"error": "The AI could not read this file"}
        except Exception:  # timeout or bad JSON: try the next model
            continue
    return 503, {"error": "AI is busy right now"}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".svg": "image/svg+xml", ".css": "text/css"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/read":
            self.send_error(404)
            return
        key = api_key()
        length = int(self.headers.get("Content-Length", 0))
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            payload = {}
        if not key:
            status, out = 503, {"error": "AI reading is not configured"}
        elif not payload.get("data") or payload.get("mimeType") not in ("image/jpeg", "image/png", "image/webp", "application/pdf"):
            status, out = 400, {"error": "Send a JPG, PNG, WebP or PDF"}
        else:
            status, out = read_bill(payload, key)
        raw = json.dumps(out).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


port = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
print(f"Billo at http://localhost:{port}")
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=str(ROOT))).serve_forever()
