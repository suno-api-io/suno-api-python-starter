# 【Recommended】 Voice profile API

> **✅ Recommended for new integrations.** According to extensive real-user testing, songs generated through this chain have a **high fidelity to the original voice**: the vocal in the finished track sounds closer to the person in the sample you uploaded, so it is the route we currently recommend to customers.
>
> For comparison: the earlier [voice clone and generate-with-voice API](current-voice-clone.md) still works, but the navigation marks it "not recommended" and it is no longer recommended for new integrations.

- Document date: 2026-09-26
- Covered capabilities: create your own voice → cover a chosen song with it / sing a new song with it → poll progress → download the finished tracks
- Every endpoint, field and response below was verified with real calls (items marked "measured" were verified in detail)

> Note: this document only describes the endpoints you call. Media handling, task scheduling and content validation are all done automatically on the server; the client does not implement them.

---

## 0. Five-minute quick start

Four steps are enough to turn one vocal sample into two finished songs.

```text
① Create the voice   POST /api/music/voice-profile/create   → get voice_id (status=ready)
② Cover with it      POST /api/music/voice-profile/cover    → immediately get 2 song_ids
③ Poll progress      POST /api/music/query                  → poll until status=completed
④ Download           GET  /api/music/download?song_id=…&kind=mp3
```

Minimal working example (curl):

```bash
API_KEY="sk-your-key"
BASE="https://www.suno-api.io"

# ① Create the voice (upload a vocal sample; 10 s or more is recommended, under 10 MB)
curl -sS -X POST "$BASE/api/music/voice-profile/create" \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@./my-voice.mp3" \
  -F "title=My voice" \
  -F "source_kind=upload"
# → {"success":true,"message":"","data":{"voice_id":"vp_2026…","status":"ready", …}}

# ② Cover a song with that voice (song_clip_id = the clip id of the song to cover)
curl -sS -X POST "$BASE/api/music/voice-profile/cover" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-Create-Ui-Client-Request-Id: cover-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{
        "model": "suno-v6",
        "voice_id": "vp_2026…",
        "song_clip_id": "5b773e9a-…",
        "lyrics": "[Verse 1]\nlyric text…",
        "style_requirements": "slow folk, acoustic guitar",
        "audio_weight": 0.85,
        "max_mode": false
      }'
# → {"code":200,"message":"success","data":{"resolved_scene":"cover","clips":[{…},{…}]}}

# ③ Poll (send several ids at once, separated by English commas)
curl -sS -X POST "$BASE/api/music/query" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"suno-v6","song_ids":"id1,id2"}'

# ④ Download the mp3 once finished (only status=completed gives you a file)
curl -sS -L "$BASE/api/music/download?song_id=id1&kind=mp3" \
  -H "Authorization: Bearer $API_KEY" -o song1.mp3
```

---

## 1. Common conventions

### 1.1 Domain and environment

| Environment | Base URL | Purpose |
| --- | --- | --- |
| Production | `https://www.suno-api.io` | Live customer traffic |

Every path below is relative to the Base URL; for example the full address of `POST /api/music/voice-profile/create` is
`https://www.suno-api.io/api/music/voice-profile/create`.

### 1.2 Authentication

All endpoints use the same request header, whose value is the API key you created in the console:

```http
Authorization: Bearer sk-xxxxxxxx
```

- The `Bearer ` prefix is optional; so is the `sk-` prefix (`Authorization: sk-xxx` works just as well).
- A missing or invalid key → HTTP 401, with a body like `{"success":false,"message":"…"}` (the wording follows the request language).
- Each key can only see and only operate on the songs and voices of **its own account**.

### 1.3 Request body formats

- Creating a voice: `multipart/form-data` is recommended (uploading a file); `application/json` (a URL or base64) is also supported.
- All other endpoints: `application/json`.

### 1.4 Two response shells (**customers only need to know these two**)

The "voice management" endpoints (create / create-from-clip / list / detail / delete) use the **business shell**:

```json
{ "success": true, "message": "", "data": { } }
```

```json
{ "success": false, "message": "voice_id is required" }
```

"Voice cover" goes through the generation channel and uses the **generation shell**: success is `code/message/data`, failure is an `error` object:

```json
{ "code": 200, "message": "success", "data": { } }
```

```json
{ "error": { "message": "voice not found: vp_xxx", "type": "bad_response_status_code", "param": "", "code": "bad_response_status_code" } }
```

How to decide: look at the HTTP status code first, then at `success === false`, then at `code !== 200` or the presence of `error`.
**A business failure does not guarantee a non-200 HTTP status** (voice management endpoints still return HTTP 200 on error), so you cannot rely on the HTTP status code alone.

### 1.5 Idempotency

**Creating a voice (including "create from existing audio") is genuinely idempotent**: under the same key, resubmitting the same `client_request_id` creates only one voice and the second attempt returns the first result directly (`success=true`, the same `voice_id`). The usage is for the client to generate an id itself (a UUID, say) and reuse the same value when retrying after a timeout.

**Cover submission does no request-level de-duplication** (it is a billed generation), so note two things:

1. The submission identifier goes in the request header `X-Create-Ui-Client-Request-Id: <your submission id>`. It is written into the server-side task record to make later investigation easier; it **does not** prevent a duplicate charge.
2. A submission timeout ≠ failure: the request may already have been accepted and be generating. Before retrying, check `GET /api/music/songs?p=1&page_size=20` (the pagination parameters are `p` / `page_size`; the compatible spelling `ps` also works) to see whether a new song with `generation_type=voice_profile_cover` has already appeared, and only resend the same request if it has not.

The bodies of `create` and `create-from-clip` also take a `client_request_id` field (see §3 and §4).

### 1.6 Billing overview

| Action | Endpoint | Price | Notes |
| --- | --- | --- | --- |
| Create a voice (standard) | `POST /api/music/voice-profile/create` | **Free** | Uploading a sample does not consume Suno credits |
| Create a voice (from existing audio) | `POST /api/music/voice-profile/create-from-clip` | **Free** | The server only registers a reference to the asset; nothing is re-uploaded |
| Enhanced clone | Same, `enhanced=true` | At the "enhanced upload price" (¥10 per call by default) | Asynchronous; refunded automatically on failure |
| Voice cover | `POST /api/music/voice-profile/cover` | **¥1.2 per call**; **¥2.4 per call** when `max_mode=true` | Returns 2 songs per call |
| Query / list / detail / delete | — | **Free** | |
| Download (take the direct link yourself) | The `audio_url` in the response | Free | Plays/streams the address we hand out |
| Download (convert to wav / lyrics etc.) | `POST /api/music/free2` | ¥0.2 per successful song | See §8 |

Prices can be read at any time from a public endpoint, so do not hard-code them (see §9):

```bash
curl -sS https://www.suno-api.io/api/pricing/catalog | jq '.data.catalog.meta'
# {
#   "generation_price": "0.6",
#   "voice_generation_price": "1.2",      ← base price for a voice cover
#   "max_mode_factor": "2",
#   "enhanced_upload_price": "10",        ← enhanced clone price
#   "voice_auto_verify_price": "5",
#   "voice_long_term_clone_price": "5"
# }
```

Covers use **pre-charge + refund on failure**:

- A rejected request (bad parameters, a platform 4xx/5xx, insufficient balance itself) **is not charged** — submitting with a non-existent voice left the balance completely unchanged in testing (delta = 0);
- An accepted task that ultimately fails (including a platform service error) goes through the server-side refund path and returns the pre-charged amount.

### 1.7 Status dictionary

The voice's `status`:

| Value | Meaning | Usable for covers |
| --- | --- | --- |
| `ready` | Ready | ✅ |
| `processing` | Only appears for an enhanced clone (`enhanced=true`); being processed | ❌ (wait for ready) |
| `failed` | Creation failed; see `error_message`; an enhanced clone has already been refunded | ❌ |

The song's `status` (the value returned by the query endpoints):

| Value | Meaning | Downloadable |
| --- | --- | --- |
| `submitted` / `queued` / `processing` | Generating (a preview stream may already exist) | ❌ |
| `completed` | Done | ✅ |
| `failed` | Failed; the charge has been refunded | ❌ |

---

## 2. Endpoint overview

| # | Method | Path | Purpose | Billing |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/music/voice-profile/create` | Create a voice (upload / URL / base64) | Free (except `enhanced=true`) |
| 2 | POST | `/api/music/voice-profile/create-from-clip` | Create a voice from audio you already have | Free |
| 3 | GET | `/api/music/voice-profile/list` | Voice list | Free |
| 4 | GET | `/api/music/voice-profile/{voice_id}` | Voice detail (including enhanced clone progress) | Free |
| 5 | POST | `/api/music/voice-profile/delete` | Delete a voice | Free |
| 6 | POST | `/api/music/voice-profile/cover` | Cover with the voice / sing a new song | ¥1.2 (MAX ¥2.4) |
| 7 | POST | `/api/music/query` | Batch song status query | Free |
| 8 | GET | `/api/music/songs/{song_id}` | Single song detail | Free |
| 9 | GET | `/api/music/download` | Download the finished file | Free (mp3/playback link) |
| 10 | POST | `/api/music/free2` | Convert to wav / fetch lyrics etc. | ¥0.2 per successful song |
| 11 | POST | `/api/music/free2/cached` | Fetch an already-archived download address | Free |
| 12 | GET | `/api/music/songs` | My works, paginated | Free |

---

## 3. Create a voice

```http
POST /api/music/voice-profile/create
```

Register a piece of vocal audio as a "voice" and get a `voice_id`. To the platform a voice is simply "a piece of audio + its clip in the catalogue", so once creation succeeds **that source audio is kept permanently** (for later covers).

### 3.1 Three input forms (pick one)

**Form A: multipart file upload (recommended)**

```http
Content-Type: multipart/form-data

file=<audio binary>         # required
title=<voice name>          # optional; when empty, the file name without its extension
file_name=<original file name>
source_file_name=<original file name>
source_kind=upload|record   # optional, source marker (upload / record), defaults to upload
enhanced=false|true         # optional, true = enhanced clone (see §3.5)
client_request_id=<idempotency key>   # optional
voice_id=<custom ID>        # optional, rarely used
```

```bash
curl -sS -X POST "https://www.suno-api.io/api/music/voice-profile/create" \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@./my-voice.mp3;type=audio/mpeg" \
  -F "file_name=my-voice.mp3" \
  -F "source_file_name=my-voice.mp3" \
  -F "title=My voice" \
  -F "source_kind=upload"
```

**Form B: JSON + a public audio URL**

```bash
curl -sS -X POST "https://www.suno-api.io/api/music/voice-profile/create" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "file_url": "https://your-cdn.example.com/voice/my-voice.mp3",
        "file_name": "my-voice.mp3",
        "title": "My voice"
      }'
```

- The URL must be a publicly reachable HTTPS direct link; the server downloads it once and stores it in our object storage.
- You can also put the address in the `audio_url` field, which is equivalent in effect (when both are sent, `file_url` wins).
- When the address is already on this platform's object storage (`*.myqcloud.com/create-ui/voice-source/...`), nothing is downloaded again: it is registered directly.

**Form C: JSON + base64**

```json
{
  "file_base64": "data:audio/mpeg;base64,//uQxAAA…",
  "file_name": "my-voice.mp3",
  "title": "My voice"
}
```

- Both a `data:audio/xxx;base64,` prefix and plain base64 are accepted.
- Size is limited (base64 inflates by 1.33×), so use form A for large files.

### 3.2 Audio requirements

| Item | Requirement | Notes |
| --- | --- | --- |
| Size | ≤ 10 MB | Over the limit the gateway truncates the body, which shows up as "rejected by Suno"; compress or trim first |
| Duration | At least 6 s; **10–60 s recommended** | Under 6 s the platform rejects it: `Uploaded audio is too short (currently 2.4 seconds). Minimum duration is 6 seconds.` |
| Format | mp3 / wav / m4a / aac / flac / ogg | Judged by the file extension |
| Content | Clean vocals; avoid finished covers or original songs with backing | Audio that closely matches an existing recording in the catalogue is rejected: `This audio matches an existing recording in our catalog.` (measured) |

### 3.3 Response

```json
{
  "success": true,
  "message": "",
  "data": {
    "voice_id": "vp_20260926080618509168500DXXrxe",
    "clip_id": "91cc5935-389f-4193-b56b-cc796c15562d",
    "song_id": "91cc5935-389f-4193-b56b-cc796c15562d",
    "account_id": "acc_1790085275308",
    "title": "My voice",
    "source_file_name": "my-voice.mp3",
    "audio_url": "https://suno-api-p-1437223057.cos.ap-guangzhou.myqcloud.com/create-ui/voice-source/2026/09/26/xxx.mp3",
    "image_url": "https://cdn2.suno.ai/image_91cc5935-389f-4193-b56b-cc796c15562d.jpeg",
    "duration_s": 29.18,
    "enhanced": false,
    "source_kind": "upload",
    "status": "ready",
    "client_request_id": "",
    "created_at": 1790409978,
    "updated_at": 1790409998
  }
}
```

Field reference (`create` / `list` / `detail` all share the same set of fields):

| Field | Type | Notes |
| --- | --- | --- |
| `voice_id` | string | **The voice ID**; covers use it later |
| `clip_id` / `song_id` | string | The clip id of that voice audio on Suno's side (the two are the same); for troubleshooting |
| `account_id` | string | The account that carries it (for troubleshooting; the client need not care) |
| `title` | string | Voice name |
| `source_file_name` | string | Original file name |
| `audio_url` | string | **Long-term direct link to the source audio**, usable for preview; kept permanently |
| `image_url` | string | Voice cover (the artwork Suno generates for vocal audio); when there is no cover **the key is absent entirely** |
| `duration_s` | number | Length of the voice sample in seconds |
| `enhanced` | bool | Whether it was created as an enhanced clone |
| `source_kind` | string | `upload` / `record` / `clip` (taken from existing audio) |
| `status` | string | `ready` / `processing` / `failed` |
| `error_message` | string | Failure reason; present only when `failed` |
| `task_id` | number | Underlying task number for an enhanced clone; only set when `enhanced=true` |
| `pre_consumed_quota` | number | Pre-charged quota (only set for an enhanced clone) |
| `created_at` / `updated_at` | number | Unix seconds |

> `created_at` / `updated_at` are **second**-level timestamps (10 digits), not milliseconds.

### 3.4 Common errors

| HTTP | message | Cause and handling |
| --- | --- | --- |
| 200 | `one of file_path, file_base64, or file_url is required` | No audio content was included |
| 200 | `Uploaded audio is too short (currently 2.4 seconds). Minimum duration is 6 seconds.` | The sample is too short; use ≥6 s (≥10 s recommended) |
| 200 | `This audio matches an existing recording in our catalog.` | The sample closely matches an existing recording in the catalogue; use a different clean dry vocal |
| 200 | `upload succeeded without clip or account identity` | The platform reply was abnormal; retry |
| 200 | `audio file exceeds 30 MB limit` | Over the server limit (for customer use, keep it to 10 MB) |
| 401 | `invalid token` | Wrong API key |

### 3.5 Enhanced clone (`enhanced=true`)

For cases where "the voice sample itself carries copyrighted lyrics / an enhanced upload is needed". Priced at the enhanced upload price (¥10 per call by default, refunded automatically on failure):

- The response is immediately `status=processing` + `task_id` (there is no `clip_id` yet) and it runs asynchronously;
- While it runs, use `GET /api/music/voice-profile/{voice_id}` to check progress, which returns `progress_percent` / `progress_stage` / `progress_message`;
- On completion `status` becomes `ready` and `clip_id`, `audio_url`, `image_url` are filled in;
- On failure `status=failed` and `error_message` reads like "the enhanced upload failed, the charge has been refunded automatically, please try again later";
- An enhanced clone takes noticeably longer than a standard one (minutes), so do not wait for it with a synchronous timeout.

```bash
curl -sS -X POST "https://www.suno-api.io/api/music/voice-profile/create" \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@./my-voice.mp3" -F "title=My voice" -F "enhanced=true"
```

---

## 4. Create a voice from existing audio

If you would rather not upload again: copy a piece of audio you have **already uploaded or already generated** straight into a voice. Free and idempotent.

```http
POST /api/music/voice-profile/create-from-clip
Content-Type: application/json

{
  "source_song_id": "97ee62fe-56cd-473f-a2f5-c66ac0766a2e",
  "title": "Xu Qing Qiang",
  "client_request_id": "vp-clip-1789…"
}
```

- `source_song_id`: the clip id of a **completed** piece of audio on your account (the same as the song's `song_id`).
- Resubmitting the same clip does not create a new record; it returns the existing voice directly with `reused: true` (measured).

The response is every field from §3.3 plus two read-only fields:

| Field | Notes |
| --- | --- |
| `reused` | `true` = this audio was already your voice and is being reused |
| `source_type` | Where the audio came from: `generate` / `custom_generate` / `voice_generate` / `upload_source` / `enhanced_upload` |

```json
{
  "success": true,
  "data": {
    "voice_id": "vp_20260926081712557959800Z5gvlt",
    "clip_id": "97ee62fe-56cd-473f-a2f5-c66ac0766a2e",
    "title": "Xu Qing Qiang",
    "status": "ready",
    "enhanced": true,
    "reused": true,
    "source_type": "enhanced_upload"
  }
}
```

Errors (`message` as returned; showing or localising it directly is recommended):

| message | Meaning |
| --- | --- |
| `source audio not found` | The clip does not exist or is not yours |
| `source audio is invalid` | That audio is still generating / is an intermediate product and not yet usable |
| `source_song_id is required` | `source_song_id` was not sent |

---

## 5. Voice list / detail / delete

### 5.1 List

```http
GET /api/music/voice-profile/list
GET /api/music/voice-profile/list?include_deleted=true
```

```json
{
  "success": true,
  "message": "",
  "data": {
    "items": [ { "voice_id": "vp_…", "title": "My voice", "status": "ready", "audio_url": "…", "image_url": "…" } ],
    "total": 1
  }
}
```

The fields are exactly those of §3.3. Deleted voices are not returned by default.

### 5.2 Detail

```http
GET /api/music/voice-profile/{voice_id}
```

Returns a single voice object (`data` is the object itself, not an array). While an enhanced clone is running it additionally carries:

| Field | Notes |
| --- | --- |
| `progress_percent` | Integer from 0 to 100 |
| `progress_stage` | Stage identifier, for example `media_preparing` |
| `progress_message` | Progress text to show the user |

### 5.3 Delete

```http
POST /api/music/voice-profile/delete
Content-Type: application/json

{ "voice_id": "vp_2026…" }
```

```json
{ "success": true, "message": "", "data": { "voice_id": "vp_2026…", "status": "deleted" } }
```

- After deletion the voice disappears from the list and **can no longer be used for new covers**: submitting with that `voice_id` returns 400 (see §6.4).
- **Songs already generated with it are completely unaffected**; playback, download, extend, replace and separation all work as before.
- Deleting a non-existent voice, or one that is not on this account, returns `{"success":false,"message":"voice not found"}`.

---

## 6. Cover with a voice (the core endpoint)

```http
POST /api/music/voice-profile/cover
Content-Type: application/json
```

One submission **generates 2 songs** (the same as ordinary generation).

### 6.1 Two scenarios

| Scenario | Trigger | Notes |
| --- | --- | --- |
| **A. Cover a chosen song** | `song_clip_id` was sent | Sings that song with your voice (melody / rhythm / sections follow the original; the vocal becomes your voice) |
| **B. Sing a new song with the voice** | `song_clip_id` not sent | Only the voice + lyrics (optional) + style requirements; the model composes a brand-new melody in that style and sings it |

The `resolved_scene` in the response echoes `cover` or `sing`, so you can confirm which route was taken.

### 6.2 Request fields

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `model` | string | **Yes** | — | Customer-facing model name, see §6.5. **Omitting it returns `model is required` (HTTP 500)** |
| `voice_id` | string | One of the two | — | Voice ID (`vp_…`); must be `status=ready` |
| `voice_clip_id` | string | One of the two | — | The voice's clip id works too; when both are sent `voice_id` wins |
| `song_clip_id` | string | No | empty | Clip id (`song_id`) of the song to cover. Not sent = scenario B |
| `lyrics` | string | No | empty | Full lyrics, **sent character for character with no rewriting or truncation**; ≤ 3000 characters |
| `cover_requirements` | string | No | empty | Cover instructions in natural language, for example "articulate more clearly". They are concatenated into a fixed prompt |
| `style_requirements` | string | No | empty | Style requirements, for example "slow folk, acoustic guitar" |
| `title` | string | No | empty | The title of these two finished songs in the workspace (it affects the `song_title` returned by later queries) |
| `negative_tags` | string | No | empty | Excluded styles, for example `electronic, rap`; ≤ 1000 characters |
| `vocal_gender` | string | No | empty | `m` / `f` (also accepts `male` / `female`); empty = any |
| `duration` | number | No | empty | Desired length in seconds, **an integer from 1 to 480**; empty = the platform decides. **The platform's practical minimum is about 30 s**: smaller values still produced roughly 30-second songs in testing |
| `audio_weight` | number | No | **0.85** | Audio Influence, a decimal from 0 to 1. Higher values stay closer to the voice sample |
| `style_weight` | number | No | empty | Style influence, a decimal from 0 to 1 |
| `weirdness_constraint` | number | No | empty | Creativity, a decimal from 0 to 1 (if your UI uses percentages, divide by 100 first) |
| `variety` | number | No | empty | Variety, **an integer from 0 to 4** (not a percentage), supported on v6 models only |
| `max_mode` | boolean | No | `false` | Max Mode, price ×2 |
| `client_request_id` | string | No | empty | Submission identifier, written into the server-side task record for troubleshooting (**no de-duplication**) |

**Sending the header `X-Create-Ui-Client-Request-Id: <the same submission id>` as well is recommended**: only that is written into the server-side task record and serves as the key for later investigation (see §1.5).

Units to watch: `audio_weight` / `style_weight` / `weirdness_constraint` are **decimals from 0 to 1**, `variety` is an **integer from 0 to 4**, `duration` is in **seconds**. Mixing them up leads to rejection or odd results.

Lyrics are optional in scenario B (the model handles it itself), but always send `lyrics` when you need specific words sung.

### 6.3 Response

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "voice_id": "vp_20260926081712557959800Z5gvlt",
    "voice_clip_id": "97ee62fe-56cd-473f-a2f5-c66ac0766a2e",
    "song_clip_id": "5b773e9a-a035-4134-a4a4-29c9961d3ccb",
    "resolved_scene": "cover",
    "model": "suno-v6",
    "audio_weight": 0.85,
    "clips": [
      {
        "song_id": "0f2a…",
        "status": "processing",
        "song_title": "",
        "model_version": "suno-v6",
        "audio_url": "",
        "play_url": "https://media.suno-api.io/play/0f2a…?expires=…&signature=…",
        "lyrics": "",
        "description": "[Task] This is a cover. … (the server's fixed structural part + the cover/style requirements you filled in)"
      },
      {
        "song_id": "7c91…",
        "status": "processing",
        "model_version": "suno-v6",
        "audio_url": ""
      }
    ],
    "source_updates": []
  }
}
```

Key points:

1. Identify the finished tracks with **`clips[].song_id`** (this endpoint returns no `id` field).
2. **You get 2 `song_id` values immediately**, while `status` is still `processing` (meaning only that they were accepted) and `audio_url` is empty; you must poll to `completed` before downloading. `play_url` is the platform's preview stream, which may already appear at submission time and will expire.
3. `description` is the prompt the server ultimately sends (the fixed structural part + the `cover_requirements` / `style_requirements` you filled in); it is very handy when investigating results.
4. `source_updates` is the server's media handling result and can be ignored by the client.
5. The `title` you send is written into the server-side task record and shows up as `song_title` in later queries; `clips[].song_title` in the submission response is usually empty, which is normal.

### 6.4 Errors

```json
{ "error": { "message": "this voice does not exist or has been deleted (voice_id=vp_xxx)…", "type": "new_api_error", "param": "", "code": "invalid_request" } }
```

| HTTP | message | Cause |
| --- | --- | --- |
| 500 | `model is required` | The body is missing `model` (a required field for channel selection) |
| 400 | `voice_id is required and must be a ready voice` | `voice_id` was not sent, or a placeholder value / a not-ready voice was sent |
| 400 | `this voice does not exist or has been deleted (voice_id=vp_xxx)…` | The voice was deleted, does not exist, or is not on the current account. Use another available voice or create a new one |
| 400 | `this voice has been deleted (voice_id=vp_xxx)…` | When passing media directly via `voice_clip_id`, the voice behind that media has been deleted; same handling as above |
| 400 | `voice is not ready yet (status=processing)` | The voice is still being created; wait for `ready` and try again |
| 400 | `song_clip_id must be a real completed clip` | `song_clip_id` is a placeholder / unfinished |
| 400 | `song_clip_id must differ from the voice clip` | The cover target cannot be the voice sample itself |
| 400 | `audio_weight must be a number between 0 and 1` | Wrong unit for the slider (a percentage was sent) |
| 400 | `duration must be an integer between 1 and 480 seconds` | The duration is not an integer from 1 to 480 |
| 400 | `vocal_gender must be one of m, f, male, female` | Invalid gender value |
| 400 | `variety must be an integer between 0 and 4` / `variety is only supported on v6 models` | Invalid variety value or unsupported model |

An insufficient balance returns a billing error right at submission and never leaves a half-finished task behind.

### 6.5 Available models (customer-facing names)

| Customer-facing model name | Notes |
| --- | --- |
| `suno-v6` | Default, recommended |
| `suno-v6-wild` | Wilder |
| `suno-v6-mini` | Lightweight |


---

## 7. Polling progress

### 7.1 Batch query (recommended)

```http
POST /api/music/query
Content-Type: application/json

{ "model": "suno-v6", "song_ids": "id1,id2" }
```

- `song_ids` is a **comma-separated string** (not an array).
- The response is a **bare array** (just `[...]`, with no `success` / `data` wrapper):

```json
[
  {
    "song_id": "0f2a…",
    "song_title": "Two Tigers",
    "status": "completed",
    "audio_url": "https://suno-api-hk-1437223057.cos.ap-hongkong.myqcloud.com/assets/0f2a…-mp3.mp3",
    "cover_url": "https://cdn2.suno.ai/image_0f2a….jpeg",
    "duration": 115.15,
    "model_version": "suno-v6",
    "generation_type": "voice_profile_cover",
    "play_url": "https://media.suno-api.io/play/…?expires=…&signature=…",
    "lyrics": "[Verse 1]…",
    "prompt": "[Verse 1]…",
    "description": "[Task] This is a cover. … (the server's final prompt)",
    "style_tags": "…",
    "created_at": "2026-09-25T18:19:09.918Z",
    "video_url": ""
  }
]
```

| Field | Notes |
| --- | --- |
| `status` | See §1.7; only `completed` counts as done |
| `audio_url` | mp3 direct link; only populated once `completed` |
| `cover_url` | Artwork address |
| `duration` | Actual length in seconds |
| `generation_type` | Songs produced by a voice cover are always `voice_profile_cover` |
| `play_url` | Signed preview address (expires) |
| `song_title` | Task title (the `title` you sent; if you sent none the server falls back) |
| `lyrics` / `prompt` | Finished lyrics / original lyric text |
| `description` | The final prompt the server sends (including the fixed structural part) |
| `style_tags` | The final style description |
| `created_at` | **An ISO 8601 string** (note this differs from the Unix seconds of the detail endpoint) |

Polling advice: **every 5–10 seconds, with an overall timeout of 10–15 minutes** (the slowest measured cold account took about 4.5 minutes; a very small number take longer). Do not judge completion by whether `audio_url` is empty — use `status`.

> Compatibility note: this endpoint identifies songs by `song_id`; a few early responses contained an `id` field, so `row.song_id || row.id` is the safe way to read it.

### 7.2 Single song detail

```http
GET /api/music/songs/{song_id}
```

```json
{
  "success": true,
  "data": {
    "song_id": "0f2a…",
    "title": "Two Tigers",
    "status": "completed",
    "generation_type": "voice_profile_cover",
    "model": "suno-v6",
    "duration": 115.15,
    "audio_url": "https://…/assets/0f2a…-mp3.mp3",
    "image_url": "https://cdn2.suno.ai/image_0f2a….jpeg",
    "wav_url": "https://www.suno-api.io/api/music/download?song_id=0f2a…&kind=wav",
    "video_url": "https://www.suno-api.io/api/music/download?song_id=0f2a…&kind=video",
    "created_at": 1790411012,
    "completed_at": 1790411500,
    "parameters": {
      "prompt": "[Verse 1]…",
      "style_tags": "…",
      "title": "Two Tigers",
      "model": "suno-v6",
      "generation_type": "voice_profile_cover",
      "source_song_id": "5b773e9a-…"
    },
    "parameter_retention": {
      "core_parameters_available": true,
      "extended_parameters_available": false,
      "sources": ["suno_tasks"],
      "unavailable_fields": ["negative_tags", "vocal_gender", "style_weight", "weirdness_constraint"]
    }
  }
}
```

- Here `created_at` / `completed_at` are **Unix seconds** (unlike the ISO strings of the batch query, so clients should tell them apart).
- `wav_url` / `video_url` are **this platform's download entries** (relative to the current domain) and a `GET` fetches the file; they are empty strings when the platform has not produced that asset.
- `parameter_retention` says which submission parameters that song can still be traced to: `core_parameters_available=true` means the core parameters (lyrics / style / source) are queryable, while with `extended_parameters_available=false` the extended parameters listed above were not retained (voice covers are currently in this category).

### 7.3 My works list

```http
GET /api/music/songs?p=1&page_size=20
GET /api/music/songs?status=completed&q=keyword
```

Pagination parameters: `p` (page number, starting at 1) / `page_size` (items per page; `ps` is a compatible spelling). Optional `status` and `q` (a title keyword). Sorted by creation time descending by default.

```json
{
  "success": true,
  "data": {
    "page": 1,
    "page_size": 20,
    "total": 42,
    "items": [
      {
        "song_id": "0f2a…",
        "title": "Two Tigers",
        "status": "completed",
        "generation_type": "voice_profile_cover",
        "model": "suno-v6",
        "duration": 115.15,
        "audio_url": "https://…/assets/0f2a…-mp3.mp3",
        "image_url": "https://cdn2.suno.ai/image_0f2a….jpeg",
        "created_at": 1790411012,
        "completed_at": 1790411500
      }
    ]
  }
}
```

Use `generation_type=voice_profile_cover` to tell "songs produced by a voice cover" apart from other generation results.

---

## 8. Downloading the finished tracks

### 8.1 Take the mp3 directly (recommended, free)

Any of these three works; pick one:

1. Use the `audio_url` from the query result (an object-storage direct link, the least work).
2. `GET /api/music/download?song_id=<id>&kind=mp3` → returns the audio bytes directly (with the file name already in `Content-Disposition`).
3. `POST /api/music/download-url` (to get a temporary signed address).

```bash
curl -sS -L "https://www.suno-api.io/api/music/download?song_id=0f2a…&kind=mp3" \
  -H "Authorization: Bearer $API_KEY" -o song.mp3
```

`kind` values: `mp3` (equivalent to `song`) / `playback` (streaming) / `wav` / `video` / `lyrics` / `timestamped_lyrics`.
`timestamped_lyrics` (`.lrc`) is currently available for only some songs; when it fails, generate the file yourself with the [timestamped lyrics API](current-lyrics-timeline.md).
The response is the raw file stream, with `Content-Type` and `Content-Disposition` (file name) already set; the `wav_url` / `video_url` returned by `GET /api/music/songs/{song_id}` are the same entry point with `kind=wav|video`.

### 8.2 Convert to wav / fetch lyrics / metadata (billed)

```http
POST /api/music/free2
Content-Type: application/json

{ "song_ids": ["0f2a…"], "files": ["mp3", "wav", "lyrics"] }
```

```json
{
  "success": true,
  "data": {
    "songs": [
      { "song_id": "0f2a…", "files": [ { "type": "mp3", "url": "https://…" }, { "type": "wav", "url": "https://…" } ] }
    ],
    "requested_songs": 1,
    "succeeded_songs": 1,
    "price": 0.2
  }
}
```

- `files` accepts: `mp3` / `wav` / `lyrics` / `metadata`, up to 10 songs at a time.
- **Billed per successful song (¥0.2 each)**; a song that fails entirely is not charged, and a failed format appears only in `songs[].errors`.
- To fetch files you already obtained before, first use the **free** `POST /api/music/free2/cached` (the same `song_ids` + `files`) to get archived addresses; `songs[].missing_files` in its response lists the formats that are not cached and must be prepared again.

---

## 9. Price lookup

```http
GET /api/pricing/catalog
```

A public endpoint requiring no authentication. Every unit price a customer needs to display is in `data.catalog.meta` (strings):

| Key | Meaning | Current value |
| --- | --- | --- |
| `generation_price` | Ordinary generation | 0.6 |
| `voice_generation_price` | **Base price of a voice cover** | 1.2 |
| `max_mode_factor` | Max Mode multiplier | 2 |
| `enhanced_upload_price` | Enhanced clone / enhanced upload | 10 |
| `voice_auto_verify_price` | Automatic voice verification | 5 |
| `voice_long_term_clone_price` | Long-term voice cloning | 5 |

Prices are adjusted in the back office, so **read them live rather than hard-coding them in the client**. The actual cover charge = `voice_generation_price` × (`max_mode_factor` again when `max_mode` is true).

---

## 10. Limits and caveats

1. **Upload size**: ≤ 10 MB (the server accepts more, but the entry gateway truncates oversized bodies at 10 MiB, which shows up as "rejected by Suno", so block it on your side first).
2. **Sample duration**: at least 6 s, 10–60 s recommended; too short and the platform rejects it.
3. **Sample content**: clean vocals; avoid anything closely matching an existing recording (the catalogue comparison rejects it).
4. **Text limits**: `lyrics` ≤ 3000 characters; `style_requirements` / `negative_tags` / `title` are advised to stay within 1000 / 1000 / 100 characters respectively (style and cover requirements are concatenated into the prompt, so keep the total within 3000 characters).
5. **Lyrics are not rewritten**: whatever you pass is what gets sung (character for character), with no local truncation.
6. **Every song yields 2 tracks**; do not assume a single result.
7. **Source audio is kept permanently**: deleting a voice does not clean up its source audio; this keeps later covers possible and keeps compliance traceable.
8. **The voice must be ready**: a `processing` voice cannot be used for covers.
9. **Request timeout**: for a cold account the first submission took up to about 4.5 minutes in testing, so set the client timeout to ≥ 6 minutes. Covers **do no request-level de-duplication**, so after a timeout check whether a new song has already appeared (§1.5) before deciding to resend.
10. **Voice ownership**: voices belong to their creator; covers only accept voices that are **ready** and **not deleted**. A voice that does not exist, has been deleted, or belongs to another account returns 400: `this voice does not exist or has been deleted (voice_id=…)`.

---

## 11. FAQ

**Q1. Does creating a voice cost anything?**
Standard creation and "create from existing audio" are both free; only covers (¥1.2 / MAX ¥2.4) and enhanced clones (¥10 by default) are billed.

**Q2. Can I use a finished song with backing as the voice sample?**
Not recommended. Anything with music, or closely matching an existing recording in the catalogue, is rejected by the platform (`This audio matches an existing recording in our catalog.`). Use a purely vocal dry recording.

**Q3. Why is `audio_url` empty after I submit a cover?**
Submission only means it was accepted and `status` is still `processing`. A playable/downloadable address appears once you have polled `/api/music/query` to `status=completed`.

**Q4. Do I need to send lyrics in scenario B (no `song_clip_id`)?**
Optional. Send `lyrics` to sing specific content; without it the model handles things itself, but with less control.

**Q5. Can audio the customer uploaded be used as a voice directly?**
Yes: via the `file_url` form of `create`, or by uploading it as a song first and then calling `create-from-clip`.

**Q6. Is money refunded if it fails?**
A request that is outright rejected (bad parameters / platform error) **is not charged**, as measured; a task that was accepted but ultimately fails returns the pre-charged amount. On terminal failure the task reports `status=failed` plus `error_message`.

**Q7. After deleting a voice, can I still listen to songs previously generated with it?**
Yes. Deletion only affects whether that voice can be used for **new** covers.

**Q8. How long a song can I cover at once?**
`duration` takes 1–480 seconds; if you omit it the platform decides from the original song / the media. Note that **the platform's finished tracks are at least about 30 seconds**: passing a smaller value still produced 29.96 / 29.76 seconds in testing.

---

## Appendix A: complete example (Node.js, with polling and download)

```js
const BASE = "https://www.suno-api.io";
const KEY = process.env.SUNO_API_KEY;
const H = { Authorization: `Bearer ${KEY}` };

// ① Create the voice (multipart)
async function createVoice(filePath, title) {
  const fd = new FormData();
  fd.set("file", new Blob([await (await import("node:fs/promises")).readFile(filePath)], { type: "audio/mpeg" }), "my-voice.mp3");
  fd.set("file_name", "my-voice.mp3");
  fd.set("source_file_name", "my-voice.mp3");
  fd.set("title", title);
  fd.set("client_request_id", `vp-create-${Date.now()}`);
  const res = await fetch(`${BASE}/api/music/voice-profile/create`, { method: "POST", headers: H, body: fd });
  const body = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data; // { voice_id, status, audio_url, ... }
}

// ② Cover
async function cover(voiceId, songClipId, lyrics) {
  const submissionId = `vp-cover-${Date.now()}`;
  const res = await fetch(`${BASE}/api/music/voice-profile/cover`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json", "X-Create-Ui-Client-Request-Id": submissionId },
    body: JSON.stringify({
      model: "suno-v6",
      voice_id: voiceId,
      song_clip_id: songClipId || "",
      lyrics: lyrics || "",
      style_requirements: "slow folk, acoustic guitar",
      audio_weight: 0.85,
      max_mode: false,
      client_request_id: submissionId,
    }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.data; // { resolved_scene, clips: [{ song_id, status }] }
}

// ③ Poll to completion (every 5 seconds, at most 15 minutes)
async function waitUntilCompleted(songIds) {
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/api/music/query`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "suno-v6", song_ids: songIds.join(",") }),
    });
    const songs = await res.json(); // bare array
    if (songs.every((s) => s.status === "completed" || s.status === "failed")) return songs;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("timeout waiting for cover");
}

// ④ Download
async function download(songId, outPath) {
  const res = await fetch(`${BASE}/api/music/download?song_id=${encodeURIComponent(songId)}&kind=mp3`, { headers: H });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  (await import("node:fs/promises")).writeFile(outPath, Buffer.from(await res.arrayBuffer()));
}

const voice = await createVoice("./my-voice.mp3", "My voice");
const result = await cover(voice.voice_id, "5b773e9a-a035-4134-a4a4-29c9961d3ccb", "[Verse 1]\nlyrics…");
const ids = result.clips.map((c) => c.song_id);
const songs = await waitUntilCompleted(ids);
for (const [i, s] of songs.entries()) {
  if (s.status === "completed") await download(s.song_id, `./out-${i}.mp3`);
}
```

## Appendix B: change log

| Date | Change |
| --- | --- |
| 2026-10-15 | Deletion semantics stated plainly (§5.3); a cover with a "deleted / unauthorised" `voice_id` now returns 400 before any pre-charge, with the error table and FAQ updated to match (alongside the voice-deletion gate shipped that day) |
| 2026-10-13 | Added the "why we recommend this chain" note at the top: according to extensive real-user testing, songs generated through this chain keep the original voice notably better |
| 2026-09-26 | First version: create a voice (three input forms) / create from existing audio / list, detail, delete / voice cover (scenarios A and B) / progress polling / download / price lookup, with measured evidence |
