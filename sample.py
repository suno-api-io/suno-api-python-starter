"""Minimal Suno-API asynchronous generation example.

Suno-API uses official Suno V6 models.
Never place a real API key in source control.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Any

import requests

BASE_URL = os.getenv("SUNO_API_BASE_URL", "https://www.suno-api.io").rstrip("/")
API_KEY = os.getenv("SUNO_API_KEY", "").strip()


class TransientApiError(RuntimeError):
    """A response that may succeed after a bounded wait."""


class PermanentApiError(RuntimeError):
    """A response that should not be retried automatically."""


@dataclass(frozen=True)
class AcceptedRequest:
    request_id: str
    idempotency_key: str
    accepted_at: int | None


def headers(idempotency_key: str | None = None) -> dict[str, str]:
    if not API_KEY:
        raise SystemExit("SUNO_API_KEY is required")

    result = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    if idempotency_key:
        result["Idempotency-Key"] = idempotency_key
    return result


def request_json(
    method: str,
    path: str,
    *,
    payload: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
    timeout: int = 300,
) -> dict[str, Any]:
    response = requests.request(
        method,
        f"{BASE_URL}{path}",
        headers=headers(idempotency_key),
        json=payload,
        timeout=timeout,
    )

    request_id = response.headers.get("X-Oneapi-Request-Id", "")
    if response.status_code == 429 or response.status_code >= 500:
        raise TransientApiError(
            f"{response.status_code} {response.text}; trace={request_id}"
        )
    if not response.ok:
        raise PermanentApiError(
            f"{response.status_code} {response.text}; trace={request_id}"
        )

    content_type = response.headers.get("Content-Type", "")
    if "application/json" not in content_type.lower():
        raise PermanentApiError(
            f"expected JSON, received {content_type!r}; trace={request_id}"
        )
    return response.json()


def accept_generation(prompt: str, model: str = "suno-v6") -> AcceptedRequest:
    idempotency_key = str(uuid.uuid4())
    body = {
        "description": prompt,
        "model": model,
        "accept_mode": "async",
    }

    delay = 5
    for attempt in range(6):
        try:
            payload = request_json(
                "POST",
                "/api/music/create",
                payload=body,
                idempotency_key=idempotency_key,
                timeout=300,
            )
            data = payload["data"]
            return AcceptedRequest(
                request_id=data["request_id"],
                idempotency_key=idempotency_key,
                accepted_at=data.get("accepted_at"),
            )
        except TransientApiError:
            if attempt == 5:
                raise
            time.sleep(delay)
            delay = min(delay * 2, 60)

    raise AssertionError("unreachable")


def wait_for_request(
    request_id: str,
    *,
    max_attempts: int = 72,
) -> dict[str, Any]:
    delay = 5
    for attempt in range(max_attempts):
        try:
            payload = request_json(
                "GET",
                f"/api/music/requests/{request_id}",
                timeout=60,
            )
        except TransientApiError:
            if attempt == max_attempts - 1:
                raise
            time.sleep(delay)
            delay = min(delay * 2, 60)
            continue

        data = payload["data"]
        if data.get("status") in {"completed", "failed"}:
            return data

        time.sleep(delay)
        delay = min(delay + 5, 30)

    raise TimeoutError(f"request still running after polling: {request_id}")


def get_song_media(song_id: str) -> dict[str, Any]:
    payload = request_json(
        "POST",
        "/api/music/download-url",
        payload={"song_id": song_id, "kind": "song"},
        timeout=60,
    )
    return payload["data"]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt", help="music description")
    parser.add_argument("--model", default="suno-v6")
    parser.add_argument("--poll-attempts", type=int, default=72)
    args = parser.parse_args()

    accepted = accept_generation(args.prompt, args.model)
    print(
        json.dumps(
            {
                "request_id": accepted.request_id,
                "idempotency_key": accepted.idempotency_key,
                "accepted_at": accepted.accepted_at,
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    final = wait_for_request(
        accepted.request_id,
        max_attempts=args.poll_attempts,
    )
    print(json.dumps(final, ensure_ascii=False, indent=2))

    for task in final.get("tasks", []):
        song_id = task.get("song_id")
        if not song_id:
            continue
        try:
            media = get_song_media(song_id)
            print(json.dumps(media, ensure_ascii=False, indent=2))
        except PermanentApiError as exc:
            print(f"media not ready for {song_id}: {exc}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

