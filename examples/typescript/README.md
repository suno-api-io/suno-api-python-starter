# TypeScript Starter

一个零运行时依赖的 TypeScript 示例，用于演示 AI 音乐生成任务的异步受理、
幂等重试、有界轮询、逐首结果处理和短期媒体地址获取。

Suno-API uses the official Suno V6 models.

## Run

Requirements: Node.js 22+ and a Suno-API key.

```bash
npm ci
npm run check
```

PowerShell:

```powershell
$env:SUNO_API_KEY = "YOUR_API_KEY"
npm start -- "bright electronic music for a short-video intro"
```

macOS / Linux:

```bash
export SUNO_API_KEY="YOUR_API_KEY"
npm start -- "bright electronic music for a short-video intro"
```

The example uses Node.js built-in `fetch` and type stripping. The only development
dependencies are TypeScript and Node.js type definitions. Do not put a real API
key in source code, an issue, a screenshot, or a log.

## Request flow

```text
POST /api/music/create
  accept_mode=async
  Idempotency-Key=<uuid>
        |
        v
202 + request_id
        |
        v
GET /api/music/requests/{request_id}
        |
        v
tasks[].song_id
        |
        v
POST /api/music/download-url
```

## Documentation

- https://www.suno-api.io/docs/current-overview/
- https://www.suno-api.io/docs/current-music-create/
- https://www.suno-api.io/docs/current-music-query/
- https://www.suno-api.io/docs/current-music-media-download/
- https://github.com/suno-api-io/suno-api-python-starter/blob/main/docs/quickstart-multilingual.md
