# Remaster API

## Endpoint description

Remaster regenerates a completed song as a "remastered version" with better audio quality. It returns 2 versions at once, and the service automatically appends `(Remastered)` to the title.

**Endpoint**: `POST /api/music/remaster`

**Billing**: Paid, billed by the requested model (default `suno-v6`, 0.6 CNY per call); the amount actually charged follows the back-office price configuration.

**About the model**: remastering uses a platform-managed model that is not affected by `model`; the `model` in the request is only used for pricing and channel selection, and passing `suno-v6` explicitly is recommended.

> **Wait times and timeouts (important)**: this is a synchronous endpoint — **the order is only accepted and handed to remastering when the response arrives**. Set your client timeout to 300 seconds or more; no response does not mean nothing was remastered, and do not retry immediately after a timeout (that duplicates the order and charges again). If the connection dropped, confirm later with `GET /api/music/songs`.

## Authentication

| Parameter | Type | Required | Notes |
|---|---|---|---|
| Authorization | string | yes | `Bearer YOUR_API_KEY` |
| Content-Type | string | yes | `application/json` |

## Request parameters

| Parameter | Type | Required | Default | Notes |
|---|---|---|---|---|
| song_id | string | yes | - | The source song ID to remaster; it must be completed and accessible to the current API key |
| model | string | no | suno-v6 | Customer-facing model name: `suno-v6`, `suno-v6-wild` or `suno-v6-mini`; used only for pricing and channel |
| variation_category | string | no | normal | Variation strength: `subtle`, `normal`, `high` (the legacy value `low` equals `subtle`) |
| style_profile | string | no | boost | Tonal style: `natural`, `boost`, `clarity` |
| tags | string | no | - | Reserved field; when non-empty it is handled by the platform |
| source_audio_url | string | no | - | Source audio address, when the source song comes from an external account |
| source_file_name | string | no | - | Source file name, when the source song comes from an external account |
| source_title | string | no | - | Source title, when the source song comes from an external account |

`audio_id`, `source_clip_id` and `sourceClipId` are equivalent spellings of `song_id`; use any one of them.

## Request example

```bash
curl -X POST https://www.suno-api.io/api/music/remaster \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "song_id": "source_song_id",
    "variation_category": "high",
    "style_profile": "clarity"
  }'
```

For the default settings, pass only the source song — equivalent to `variation_category: normal` + `style_profile: boost`:

```json
{ "model": "suno-v6", "song_id": "source_song_id" }
```

## Response

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "clips": [
      {
        "song_id": "remastered_clip_id_1",
        "song_title": "Source song title (Remastered)",
        "status": "processing"
      },
      {
        "song_id": "remastered_clip_id_2",
        "song_title": "Source song title (Remastered)",
        "status": "processing"
      }
    ]
  }
}
```

One call returns **2** remastered versions. Save both `clips[].song_id` values, then poll the [song query API](current-music-query.md) until `complete` before fetching the audio.

## Notes

- The source song must be completed and within the current API key's access scope; external source material is synchronised to the executing account automatically.
- Remastering only redoes audio quality: to change style, arrangement or vocals, use [boost style](current-music-boost-style.md), [upload then cover](current-music-upload-cover.md) or the [Remix endpoints](current-music-mashup.md).
- The larger `variation_category` is, the more the remastered version differs from the source song; before a real delivery, try a `normal` pass first and then go higher.
