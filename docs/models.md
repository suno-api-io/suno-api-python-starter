# Suno API Models: V6, V6 Wild and V6 Mini

> **Model guide:** [Choose between Suno V6, V6 Wild and V6 Mini](/en/blog/suno-v6-wild-mini/)

## Currently available generation models

Customer-facing generation accepts only `suno-v6`, `suno-v6-wild` and `suno-v6-mini`.
`suno-v6` is the default when the `model` field is omitted.

> **Short answer:** use `suno-v6` for normal generation, `suno-v6-wild` for more varied
> results, and `suno-v6-mini` for the lighter V6 variant. Older models cannot be used for
> new requests; they may still appear in historical task records.

| Platform model name | Display name | Purpose | Status |
|---|---|---|---|
| `suno-v6` | Suno V6 | Default model for standard generation | Available |
| `suno-v6-wild` | Suno V6 Wild | Wild variant of V6 | Available |
| `suno-v6-mini` | Suno V6 Mini | Mini variant of V6 | Available |

Default recommendation: `suno-v6`.

## A note on stems

Stem separation is a standalone fixed capability; it does not require you to pick a
song-generation model. When you call the stem endpoint you only supply the source song
and the stem mode, for example `two` or `twelve`. The number of results actually returned
is whatever the response reports.

## The `model` parameter

In generation endpoints `model` is usually optional:

- Omitted: the current default `suno-v6` is used.
- Supplied: it must be `suno-v6`, `suno-v6-wild` or `suno-v6-mini`.
- Only the platform model names in the table above are accepted.

### Minimal generation example

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  -d '{
    "description": "an upbeat pop song about the first day of spring",
    "model": "suno-v6"
  }'
```

> **Waiting time and timeouts.** Generation endpoints are synchronous: the order is only accepted once the response arrives. Measured on production, most requests return in 1-3 seconds, about 10% take longer than 30 seconds, and the longest observed wait is about 230 seconds. **Set your client timeout to 300 seconds or more** (the `--max-time 300` above); a timeout does **not** mean the song was not generated, so do not retry immediately - check `GET /api/music/songs` first. See “Wait times and timeout settings” in the [new API overview](current-overview.md).

### V6 variant example

```json
{
  "model": "suno-v6-wild",
  "description": "an electronic track with an experimental structure"
}
```

## Retired models

The following models can no longer be used for new requests:

- `suno-v2`
- `suno-v3`
- `suno-v3-5`
- `suno-v4`
- `suno-v4-5`
- `suno-v4-5-all`
- `suno-v4-5-plus`
- `suno-v5`
- `suno-v5-5`

Existing songs and historical tasks may still report an old `model_name` or
`model_version` in query results. That is historical data; it does not mean the old model
can accept new requests.

For compatibility with older clients that are still running, a request that names a
retired model is processed with the current default `suno-v6` instead of being rejected.
The task record will report `suno-v6`; you will not receive a "model unavailable" error.
You should still update your request examples to the current model names as soon as
possible.

## Listing models

`GET /v1/models` should include at least these standard song models:

```json
{
  "object": "list",
  "data": [
    { "id": "suno-v6", "object": "model", "owned_by": "suno" },
    { "id": "suno-v6-wild", "object": "model", "owned_by": "suno" },
    { "id": "suno-v6-mini", "object": "model", "owned_by": "suno" }
  ]
}
```

The response may also contain lyric models, compatibility routes or other internal
models. Do not confuse those with the V6 song-generation models.

## Reading model fields in responses

`model_version`, `model` and `model_name` in query results can come from either the stored
platform value or the API response:

- The stored current generation model normally reads `suno-v6`, `suno-v6-wild` or
  `suno-v6-mini`.
- The model field returned by the API always uses the platform model name.
- Historical tasks may show a retired model name. Treat that as historical display data
  and do not resubmit requests with it.

## Choosing between the V6 variants

Most integrations only ever need the default. The three variants differ in how tightly
they follow the prompt versus how much variation they introduce:

| Variant | Use it when |
|---|---|
| `suno-v6` | You want a predictable result that follows the description closely. This is the default and the right choice for production pipelines. |
| `suno-v6-wild` | You want more variation and are happy to audition several takes — useful when exploring a style rather than shipping a specific brief. |
| `suno-v6-mini` | You want the cheapest way to iterate on a prompt before committing to a full generation. |

Because a run returns two tracks either way, a practical workflow is to draft with
`suno-v6-mini`, then re-run the prompt you liked on `suno-v6` for the take you actually
publish.

## Cost and refunds

Generation is billed per request, not per model: each run costs 0.6 CNY and returns two
tracks. A failed generation is refunded automatically, so an unsuccessful attempt never
consumes balance. Downloads are unlimited and are never billed separately.
