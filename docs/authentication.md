# Suno API Key Authentication

Every request to the Suno-API is authenticated with an API key. This page covers how to
create a key, how to send it, what the error responses mean, and how to keep it safe.

> **Short answer:** `suno_api_key` is not a JSON request field. Put the key in the
> `Authorization` header as `Bearer YOUR_API_KEY`, then send `Content-Type: application/json`
> with the request body. The same rule applies to generation, query, download and account
> endpoints.

> **Integration examples:** [test a request with cURL or Postman](/en/blog/suno-api-curl-postman/),
> interpret [request_id and song_id](/en/blog/suno-api-task-result-fields/), and run a
> [bounded batch queue](/en/blog/suno-api-batch-generation/).

## API keys

An API key is a bearer token tied to your account. It carries your balance, so anything
that has the key can spend it. Keys are created per account and are shown only once — copy
a new key immediately and store it somewhere safe.

## Creating a key

1. Register at <https://www.suno-api.io> — an email address is enough, no phone number.
2. Open the console and go to token management.
3. Create a new key and copy it.

Keys look like `sk-…`. If you lose a key you cannot recover it; create a new one and
delete the old one.

## Using a key

### Request header format

Send the key in the `Authorization` header on every request:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Example

> **Waiting time and timeouts.** The example below calls a generation endpoint
> (`POST /api/music/create`), which is **synchronous**: the order is only accepted once the
> response arrives, and there is no intermediate response while the service completes the
> required security checks. Measured on production: most
> requests return in 1-3 seconds, about 10% take longer than 30 seconds, and the longest
> observed wait is about 230 seconds. **Set your client timeout to 300 seconds or more.**
> A timeout or dropped connection does **not** mean the song was not generated - the order
> may already be accepted and generating. Do not retry immediately (that creates a second
> order and charges again); check `GET /api/music/songs` first. See "Waiting time and
> timeouts" in the [API overview](/docs/current-overview/).

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  -d '{"description": "a calm piano piece for a cafe"}'
```

## Authentication errors

### 401 Unauthorized

The header is missing, malformed, or the key does not exist.

```json
{
  "error": {
    "message": "Invalid API key provided",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

Check that the header reads exactly `Bearer <key>` — with a space after `Bearer` — and
that you have not copied a trailing newline into the key.

### 403 Forbidden

The key exists but is not allowed to make this request — most often because the key was disabled or the account was suspended. Check the account status in the console and contact support if the reason is not obvious.

## Security practices

### Keep the key out of client-side code

Never ship a key inside a web page, a mobile app or a desktop binary. Anyone who can open
developer tools can read it and spend your balance. Call the API from your own server and
expose your own endpoint to your users.

### Use environment variables

#### Linux / macOS

```bash
# ~/.bashrc or ~/.zshrc
export SUNO_API_KEY="sk-your-key-here"
```

```bash
# in code
curl -H "Authorization: Bearer $SUNO_API_KEY" ...
```

```python
# python
import os
api_key = os.environ["SUNO_API_KEY"]
```

#### .env

```dotenv
# .env file — make sure it is listed in .gitignore
SUNO_API_KEY=sk-your-key-here
```

#### Windows

```cmd
setx SUNO_API_KEY "sk-your-key-here"
```

#### Node.js

```javascript
require('dotenv').config();
const apiKey = process.env.SUNO_API_KEY;
```

### Rotate keys when needed

Rotate keys every 3-6 months, and immediately if you suspect a leak. Delete the keys you no longer use: an unused key is only an unused risk.

## Rate limits

Requests are rate limited per key:

| Limit | Value | Notes |
|---|---|---|
| Requests per second | 10 | Per API key |
| Requests per minute | 100 | Per API key |
| Concurrent generation tasks | 5 | At most five generations at the same time |

### 429 Too Many Requests

When you exceed a limit the API returns `429`, and the response may carry a `retry_after` value in seconds. Wait that long before the next attempt; reduce your request rate, queue the work, or retry with exponential backoff instead of in a tight loop.

```json
{
  "error": {
    "message": "Rate limit exceeded, please retry later",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

### Retry strategy

Retry only on explicit failures. **Do not retry after a read or connection timeout**: generation endpoints are synchronous, so a timeout may mean the order was already accepted and is generating — retrying creates a duplicate order and charges you twice. Set the client timeout to 300 seconds or more and, after a dropped connection, confirm the order with `GET /api/music/songs` before resubmitting. See “Wait times and timeout settings” in the [new API overview](current-overview.md).

Retry with exponential backoff rather than in a tight loop:

```python
import time

delay = 1.0
for attempt in range(5):
    response = call_api()
    if response.status_code != 429:
        break
    time.sleep(delay)
    delay *= 2
```

## FAQ

### What format does an API key have?

It starts with `sk-` followed by letters and digits, about 50-60 characters in total.

### Can I call the API directly from a browser?

Technically yes, but do not do it in production. The key would be visible to every visitor.
Proxy the request through your own backend instead.

### How do I check whether a key is still valid?

Make any authenticated request. A `200` means the key works; `401` means it is invalid or
deleted.

### I lost my key — what now?

Keys cannot be recovered. Create a new one in the console and delete the old entry.

### How many keys can one account have?

There is no fixed limit. Create one key per application or environment so you can revoke them independently, and delete the ones you stop using.

### Do keys expire?

Keys stay valid until you delete them or the account is closed. Rotate them periodically
as good practice.

### How do I monitor usage?

Sign in to the console: per-key usage is listed there, including request counts, spend and recent tasks.

## Related pages

- [Quick start guide](quick-start.md)
- [Supported models](models.md)
