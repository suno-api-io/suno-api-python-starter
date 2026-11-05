# Suno API Quick Start: Key, First Song & Download

Create a key, submit one generation, poll until it completes, then download MP3 or WAV.
The minimal workflow below takes about five minutes.

> **Short answer:** send the key as `Authorization: Bearer YOUR_API_KEY`, call
> `POST /api/music/create`, poll `POST /api/music/query` until the status is completed,
> then use the returned media URL. One generation costs 0.6 CNY and returns two tracks.

> The current default generation model is `suno-v6`. Models `suno-v2` through `suno-v5-5`
> are retired — they may appear in historical tasks but cannot be used for new requests.

> **Developer guides:** [test with cURL and Postman](/en/blog/suno-api-curl-postman/) ·
> [request_id and song_id fields](/en/blog/suno-api-task-result-fields/) ·
> [MP3 and WAV downloads](/en/blog/suno-api-download-mp3-wav/) ·
> [batch generation and concurrency](/en/blog/suno-api-batch-generation/)

## Step 1: Get an API key

1. Open <https://www.suno-api.io>
2. Click **Get API key** and register or sign in. An email address is enough; no phone
   number is required.
3. In the console, open token management and create a new key.
4. Copy the key immediately — it is shown only once. Top up the balance with a redemption
   code before your first paid call.

## Step 2: Configure the request

Every call uses the same base URL and headers:

```http
POST https://www.suno-api.io
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## Step 3: Make your first request

### Example 1 — generate from a one-line description

Describe the song and the API writes the lyrics, melody and arrangement:

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  -d '{
    "description": "an upbeat folk song about the first day of spring",
    "model": "suno-v6"
  }'
```

Response:

```json
[
  {
    "song_id": "abc123",
    "status": "pending",
    "song_title": "Spring Story",
    "description": "an upbeat folk song about the first day of spring",
    "created_at": "2026-04-22T10:30:00Z"
  },
  {
    "song_id": "def456",
    "status": "pending",
    "song_title": "Footsteps of Spring",
    "description": "an upbeat folk song about the first day of spring",
    "created_at": "2026-04-22T10:30:00Z"
  }
]
```

> One run returns two different takes so you can pick the better one. A single generation
> costs ¥0.6.

### Example 2 — check generation progress

Pass the returned `song_id` values to the query endpoint:

```bash
curl -X POST https://www.suno-api.io/api/music/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_ids": ["abc123", "def456"],
    "model": "suno-v6"
  }'
```

While the task is running:

```json
[
  {
    "song_id": "abc123",
    "status": "processing",
    "song_title": "Spring Story",
    "progress": "60%"
  }
]
```

When it finishes:

```json
[
  {
    "song_id": "abc123",
    "status": "completed",
    "song_title": "Spring Story",
    "audio_url": "https://media.code-go.com/assets/abc123-mp3.mp3",
    "video_url": "https://media.code-go.com/assets/abc123-mp4.mp4",
    "cover_url": "https://media.code-go.com/assets/abc123-cover.jpg",
    "duration": 168
  }
]
```

`status` moves through `pending`, `submitted`, `processing` and finally `completed`.
Addresses can be empty while a task is still running — judge by `status`, not by whether
`audio_url` is populated.

## Step 4: Download the file

Once `status` is `completed`, request `audio_url` directly. MP3 and WAV downloads are
unlimited and do not cost extra. A WAV master is available through the WAV endpoint if you
need lossless audio for further editing.

> **⚠️ Media URLs expire after 7 days.** `audio_url` (and WAV / other media links) are served from our object storage. Download the files and move them to your own storage within 7 days; after that the old link returns 404. Once it expires, call the song query API again to get a **fresh valid URL** — no regeneration and no extra charge.

## Common scenarios

### Background music for a video

```json
{
  "description": "calm lo-fi background music for a product video, no vocals, steady dynamics",
  "instrumental": true,
  "model": "suno-v6"
}
```

Setting `instrumental` to `true` produces instrumental audio only. See the instrumentation
note in [Supported models](models.md) for stem handling.

### Custom lyrics and style

```json
{
  "lyrics": "[Verse 1]\nCity lights are fading slow\n\n[Chorus]\nWe keep walking, we keep going",
  "style": "acoustic pop, warm female vocal, 92 BPM",
  "model": "suno-v6"
}
```

### Polling until the task completes

```python
import time
import requests

API_KEY = "sk-your-key-here"
BASE = "https://www.suno-api.io"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

created = requests.post(
    f"{BASE}/api/music/create",
    headers=HEADERS,
    json={"description": "an upbeat folk song about spring", "model": "suno-v6"},
    timeout=300,
).json()

song_ids = [track["song_id"] for track in created]

for _ in range(60):
    time.sleep(10)
    tracks = requests.post(
        f"{BASE}/api/music/query",
        headers=HEADERS,
        json={"song_ids": song_ids, "model": "suno-v6"},
        timeout=300,
    ).json()
    if all(track.get("status") == "completed" for track in tracks):
        for track in tracks:
            print(track["song_title"], track["audio_url"])
        break
```

> **Waiting time and timeouts.** Generation endpoints are synchronous: the order is only accepted once the response arrives, and there is no intermediate response while the service completes the required security checks. Measured on production: most requests return in 1-3 seconds, about 10% take longer than 30 seconds, and the longest observed wait is about 230 seconds. **Set your client timeout to 300 seconds or more.** A timeout or dropped connection does **not** mean the song was not generated - the order may already be accepted and generating. Do not retry immediately (that creates a second order and charges again); check `GET /api/music/songs` first. See “Wait times and timeout settings” in the [new API overview](current-overview.md).
>
> **Optional accept receipt.** If your client cannot hold a long connection, `POST /api/music/create` and `POST /api/music/create/custom` also accept `"accept_mode": "async"` (or the header `X-Accept-Mode: async`). The call then returns `202` immediately with a `request_id`, and generation continues in the background - poll `GET /api/music/requests/{request_id}` for progress. Without the flag the behaviour is unchanged.

## Error handling

### Common status codes

| Code | Meaning | What to do |
|---|---|---|
| 200 | Success | Read the response body |
| 400 | Bad request — a parameter is missing or malformed | Check the payload against the reference |
| 401 | Invalid or missing API key | Check the `Authorization` header |
| 402 | Insufficient balance | Top up the account |
| 403 | Key disabled or account suspended | Contact support |
| 429 | Rate limited | Retry with exponential backoff |
| 500 | Server error | Retry; contact support if it persists |

### Error response shape

```json
{
  "error": {
    "message": "Invalid API key provided",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

## Best practices

- Keep the key server-side. Never embed it in a browser or a shipped app.
- Poll at a sensible interval (10–15 seconds) instead of in a tight loop.
- Persist `song_id` values. They are the only handle for retrieving generated audio later.
- Handle `429` and `500` with retries; do not retry `400` or `401` unchanged.
- Failures refund automatically, so a failed task never costs you money.
- **Client timeout**: a generation endpoint only counts as accepted when it responds — set the client timeout to 300 seconds or more.
- **Retries**: retry only on explicit failures (4xx/5xx). After a connection timeout or drop, confirm with `GET /api/music/songs` whether the order was already accepted, so you do not create a duplicate order and pay twice.

## Next steps

- [Authentication](authentication.md) — key handling, errors and rate limits
- [Supported models](models.md) — model names, stems and retired models

## Need help?

Sign in to the console to check balance and task history. If a task shows `completed` but
an address is still empty, contact support and include the `song_id`.
