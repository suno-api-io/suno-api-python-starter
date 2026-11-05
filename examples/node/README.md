# Node.js Starter

A zero-dependency Node.js example for the independent Suno-API service.

It demonstrates asynchronous generation acceptance, `Idempotency-Key`, bounded
request polling, separation of `request_id` and `song_id`, and retrieval of a
short-lived media URL.

Suno-API is an independent third-party service and is not affiliated with Suno.

## Run

PowerShell:

```powershell
$env:SUNO_API_KEY = "YOUR_API_KEY"
node index.mjs "bright electronic music for a short-video intro"
```

macOS / Linux:

```bash
export SUNO_API_KEY="YOUR_API_KEY"
node index.mjs "bright electronic music for a short-video intro"
```

The example uses the built-in `fetch` API and has no npm dependencies.

## Documentation

- https://www.suno-api.io/docs/current-overview/
- https://www.suno-api.io/docs/current-music-create/
- https://www.suno-api.io/docs/current-music-query/
- https://www.suno-api.io/docs/current-music-media-download/

