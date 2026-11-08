# AI Music Media Delivery: URL Expiry, Refresh, Rehosting, and Verification

> Published: 2026-11-08
> Scope: engineering guidance for applications that generate music through the
> public Suno-API HTTP interface.

## Quick answers

### 简体中文

媒体地址是临时交付通道，不是永久资产。歌曲完成并拿到有效地址后，应在地址过期前下载文件、计算哈希并转存到自己的对象存储。地址过期后重新查询或刷新下载地址即可，不需要重新生成歌曲。

### English

A media URL is a temporary delivery channel, not the asset itself. After a song
is completed, download and verify the file, compute its SHA-256 hash, and copy it
to your own object storage before the URL expires. If the URL expires, refresh
the download address instead of generating the song again.

### 日本語

メディア URL は一時的な配信経路であり、恒久的な資産ではありません。楽曲の完了後にファイルをダウンロードし、SHA-256 を計算して、URL の有効期限前に自社のオブジェクトストレージへ保存してください。URL が失効した場合は、楽曲を再生成せずダウンロード URL を更新します。

### Français

Une URL de média est un canal de livraison temporaire, et non l'actif final.
Après la génération, téléchargez le fichier, calculez son empreinte SHA-256 et
copiez-le dans votre propre stockage objet avant l'expiration de l'URL. Si
l'URL expire, actualisez l'adresse de téléchargement au lieu de régénérer le
morceau.

### Русский

URL медиафайла — временный канал доставки, а не сам актив. После завершения
генерации скачайте файл, вычислите SHA-256 и сохраните его в собственном
объектном хранилище до истечения срока действия URL. Если URL истёк, обновите
адрес загрузки, а не создавайте композицию заново.

## The delivery model

Treat a generated song as a chain of separate records:

| Stage | Record | Purpose |
| --- | --- | --- |
| Generation accepted | `request_id` | Tracks the asynchronous request |
| Song task discovered | `task_index` + `song_id` | Identifies each result in that request |
| Song completed | generation status | Confirms that media can be prepared |
| Media prepared | short-lived URL | Temporary transport, normally valid for 7 days |
| Media persisted | `asset_id` + object key + SHA-256 | Stable long-term delivery record |

The most important rule is simple: **persist the bytes, not only the URL**.

## Why media URLs expire

The public media-download API returns URLs from managed object storage. The
documentation states that MP3, WAV, video, cover, and related media addresses
normally remain valid for 7 days. Once the file is reclaimed, an old URL may
return HTTP 404 even though the song still exists.

An expired URL does not mean:

- generation failed;
- the song was deleted;
- the user must pay for another generation;
- the underlying `song_id` is invalid.

It only means the transport address needs to be refreshed.

## Refresh or regenerate?

Use different actions for different failure classes:

| Symptom | First action | Do not do this |
| --- | --- | --- |
| Short-lived media URL returns 404 | Request a new download URL | Do not regenerate the song |
| Media is not ready immediately after completion | Retry the media lookup with a bounded wait | Do not create another generation |
| 401 or 403 | Fix authentication or permission scope | Do not retry indefinitely |
| 429 | Reduce concurrency and wait | Do not increase polling frequency |
| 5xx or temporary network error | Retry with backoff and a maximum attempt count | Do not assume generation failed |
| Download finishes with the wrong MIME type | Reject the file and inspect the response | Do not store unverified bytes |

## Recommended data model

Keep generation and media delivery as separate records:

```text
generation_request
  request_id
  idempotency_key
  request_status
  created_at

song
  song_id
  request_id
  task_index
  song_status
  title
  model
  completed_at

media_asset
  asset_id
  song_id
  kind
  object_key
  content_type
  byte_size
  checksum_sha256
  source_url_fetched_at
  stored_at
  verified_at
```

Use a stable internal `asset_id` as the identifier your application exposes.
The upstream `song_id` remains useful for lookups, while the object key and
checksum belong to your own storage.

## Delivery pipeline

1. Confirm that the song status is complete.
2. Request the media URL for the required `kind`.
3. Download to a temporary local or server-side object.
4. Check the HTTP status and response `Content-Type`.
5. Compute a SHA-256 checksum while streaming.
6. Store the file under an application-owned object key.
7. Read back the stored object and compare size and checksum.
8. Record the song ID, asset ID, media type, checksum, and timestamps.
9. Delete or expire the temporary download.
10. Serve users from the stable object key, not the upstream short-lived URL.

Never mark the delivery complete before the final object has been verified.

## Python example

The example below uses only the public API. It intentionally rejects
non-successful downloads and writes through a temporary `.part` file.

```python
import hashlib
import os
from pathlib import Path

import requests

BASE_URL = "https://www.suno-api.io"
API_KEY = os.environ["SUNO_API_KEY"]
HEADERS = {"Authorization": f"Bearer {API_KEY}"}


def refresh_media_url(song_id: str, kind: str = "song") -> str:
    response = requests.post(
        f"{BASE_URL}/api/music/download-url",
        headers={**HEADERS, "Content-Type": "application/json"},
        json={"song_id": song_id, "kind": kind, "refresh": True},
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()["data"]
    return data["url"]


def download_and_hash(url: str, destination: Path) -> str:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".part")
    digest = hashlib.sha256()

    with requests.get(url, stream=True, timeout=(15, 180)) as response:
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "")
        if not content_type:
            raise RuntimeError("media response has no Content-Type")

        with temporary.open("wb") as output:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if not chunk:
                    continue
                digest.update(chunk)
                output.write(chunk)

    os.replace(temporary, destination)
    return digest.hexdigest()
```

Production code should also set a maximum file size, record the source
`Content-Type`, and upload the verified file to the application's object
storage before deleting the temporary copy.

## Node.js example

```javascript
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { rename } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const BASE_URL = "https://www.suno-api.io";
const API_KEY = process.env.SUNO_API_KEY;

async function refreshMediaUrl(songId, kind = "song") {
  const response = await fetch(`${BASE_URL}/api/music/download-url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ song_id: songId, kind, refresh: true }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`media refresh failed: ${response.status}`);
  }

  return (await response.json()).data.url;
}

async function downloadAndHash(url, destination) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`media download failed: ${response.status}`);
  }

  const hash = createHash("sha256");
  const temporary = `${destination}.part`;
  const hasher = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  await pipeline(
    Readable.fromWeb(response.body),
    hasher,
    createWriteStream(temporary),
  );

  await rename(temporary, destination);
  return hash.digest("hex");
}
```

Add a checksum comparison after uploading to object storage. A successful
download alone does not prove that the stored copy is intact.

## Recovery from an expired URL

Use this sequence:

1. Try the known media lookup with `refresh: true`.
2. If the URL refreshes, download and verify the file.
3. If the song is not found, verify account ownership and the `song_id`.
4. If the status is still processing, wait with bounded backoff.
5. If the status is failed, record the failure terminal state.
6. Do not create a new generation merely because a media URL expired.

## Retention policy

- Store audio files according to the product's own retention policy.
- Keep a checksum and content type for every persisted asset.
- Separate temporary media from stable delivery assets.
- Reconcile missing object-storage records against `song_id`.
- Delete abandoned `.part` files on a schedule.
- Record when a source URL was refreshed without logging the full signed URL.

## Acceptance checklist

- [ ] A completed song produces media for each required kind.
- [ ] The download response has the expected HTTP status and content type.
- [ ] The file is written through a temporary path.
- [ ] SHA-256 is calculated while streaming.
- [ ] The file is copied to application-owned object storage.
- [ ] The stored object is read back and verified.
- [ ] The database stores a stable asset ID and object key.
- [ ] Expired source URLs are refreshed without regenerating the song.
- [ ] Temporary URLs and API keys are excluded from logs.
- [ ] Error handling distinguishes authentication, rate limits, transient
  failures, expired URLs, and terminal generation failures.

## Public references

- API overview: https://www.suno-api.io/docs/current-overview/
- Song query API: https://www.suno-api.io/docs/current-music-query/
- Media download API: https://www.suno-api.io/docs/current-music-media-download/
- Models: https://www.suno-api.io/docs/models/
- GitHub documentation mirror: https://github.com/suno-api-io/suno-api-python-starter/blob/main/docs/README.md

This guide describes application-side delivery engineering. Interface
behaviour and current media limits should be checked against the live public
API documentation.
