# 灵感模式生成 API

## 接口说明

灵感模式生成适合用一句话描述生成完整歌曲。系统会根据描述自动生成歌词、旋律、编曲和演唱。

**接口地址**: `POST /api/music/create`

**计费**: 收费，当前默认 0.6 元/次。每次通常返回 2 首歌曲，实际扣费以当前后台价格配置为准。

**Max Mode / Variety**：本接口支持可选参数 `max_mode` 与 `variety`（0-4）。开启 `max_mode`
时本次按 2 倍价格计费（0.6 → 1.2 元/次），`variety` 不额外计费；两者含义与写法见
[新版 API 总览](current-overview.md) 的「高级参数」一节。

**推荐模型**: `suno-v6`

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。实测多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。**请把客户端超时设置为 300 秒以上；未收到响应不等于没有生成，超时后请勿立即重试（会重复下单、重复扣费）。** 连接中断可稍后用 `GET /api/music/songs` 确认。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

## 请求参数

### Headers

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | Bearer YOUR_API_KEY |
| Content-Type | string | 是 | application/json |

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| description | string | 是 | - | 歌曲描述，支持中英文；**最多 3000**（按 UTF-16 码元；超长返回 400，不扣费） |
| model | string | 否 | suno-v6 | 对客模型名：`suno-v6`、`suno-v6-wild` 或 `suno-v6-mini` |
| instrumental | boolean | 否 | false | 是否纯音乐 |
| wait_completion | boolean | 否 | false | 是否等待生成完成后再返回 |
| references | array | 否 | - | 参考素材列表，可挂参考歌曲 / 传统音色 / 参考图；最多 5 首歌曲、1 个音色、1 张图片。详见下方「参考素材 references（可选）」 |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "description": "一首轻快的中文流行歌，关于夏天海边",
    "instrumental": false,
    "wait_completion": false
  }'
```

## 参考素材 references（可选）

`references` 是一个数组，用来给这次生成挂「参考资料」。**可以不传**（不传就与以前完全一致），也可以只挂一种或任意组合。

### 元素类型

| type | 必填字段 | 可选字段 | 数量上限 | 说明 |
|---|---|---|---|---|
| `song` | `song_id` | `style_prompt`、`lyrics`、`duration_s` | 5 | 参考歌曲；`song_id` 取自[歌曲查询与历史 API](current-music-query.md) 返回的 `song_id`，且歌曲必须已完成 |
| `voice` | `voice_id` | - | 1 | 传统音色（人声）；`voice_id` 取自[人声克隆与指定人声生成 API](current-voice-clone.md) |
| `image` | `base64` | - | 1 | 参考图；传 `data:image/jpeg;base64,...` 形式的 base64 内容 |

### 规则

- **参考歌曲的顺序就是语义顺序**：按你要表达的先后顺序传入（例如"用第一首的旋律、第二首的人声"）。
- `style_prompt` / `lyrics` / `duration_s` 都可以不填，平台会自动从歌曲信息里补齐；填了以你填的为准。
- 纯器乐歌曲的 `lyrics` 传 `""` 或 `"[Instrumental]"` 都可以。
- 参考图支持 `jpeg` / `png` / `webp`，单张不超过 10MB，以 **base64** 形式随请求体一并提交。
- 挂多首参考歌曲时，建议同时使用 `accept_mode=async`（见上方「受理回执模式」）：服务端需要先把参考素材准备好，同步等待时间可能较长。

### 示例：挂 2 首参考歌曲

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "description": "把这些灵感合成一首歌",
    "references": [
      { "type": "song", "song_id": "43eb711d-81f8-4e72-a68e-b2498bac88f9" },
      { "type": "song", "song_id": "a90438d2-35fc-4443-88f4-56531e6e5d24" }
    ]
  }'
```

### 示例：参考歌曲 + 传统音色

```json
{
  "model": "suno-v6",
  "description": "用这个音色演唱这些灵感",
  "references": [
    { "type": "song",  "song_id": "43eb711d-81f8-4e72-a68e-b2498bac88f9" },
    { "type": "voice", "voice_id": "5813cbe1-36f1-414a-a9a8-4d399dfeb292" }
  ]
}
```

### 示例：参考歌曲 + 参考图

```json
{
  "model": "suno-v6",
  "description": "参考这张图的氛围",
  "references": [
    { "type": "song",  "song_id": "43eb711d-81f8-4e72-a68e-b2498bac88f9" },
    { "type": "image", "base64": "data:image/jpeg;base64,/9j/4AAQ..." }
  ]
}
```

### 参数错误

以下情况会返回 HTTP 400，**在扣费之前拦截，不会产生费用**：

| 情况 | 错误信息 |
|---|---|
| 参考歌曲超过 5 首 | `references supports at most 5 song references` |
| 音色超过 1 个 | `references supports at most 1 voice reference` |
| 参考图超过 1 张 | `references supports at most 1 image reference` |
| `type` 取值非法 | `references[0].type must be one of song, voice, image` |
| 歌曲缺少 `song_id` | `references[0].song_id is required` |
| 歌曲尚未完成 | `references[0].song_id must be a real completed clip` |
| 同一首歌重复传入 | `references[0].song_id is duplicated` |

> `references[0]` 里的数字是该元素在数组中的下标，便于定位是哪一项出错。

## 响应结果

返回歌曲数组，通常包含 2 条任务或歌曲。

```json
[
  {
    "song_id": "clip_id",
    "song_title": "夏日海风",
    "status": "pending",
    "description": "一首轻快的中文流行歌，关于夏天海边",
    "audio_url": "",
    "cover_url": "",
    "video_url": "",
    "model_version": "suno-v6",
    "generation_type": "generate",
    "created_at": "2026-05-21T10:00:00Z"
  }
]
```

## 受理回执模式（可选，推荐给不想挂长连接的客户端）

默认情况下本接口是同步接口：响应返回时才代表订单已被受理，实测最长可能等到约 230 秒。
如果客户端不适合挂长连接，可以开启**受理回执模式**——二选一：

- 请求体加 `"accept_mode": "async"`
- 请求头加 `X-Accept-Mode: async`

开启后接口**立刻返回 HTTP `202`**，只表示"已受理、已进入生成队列"，生成在后台继续：

```json
{
  "success": true,
  "data": {
    "request_id": "ac_20260920092714315816800d76fv3nq",
    "status": "queued",
    "accepted_at": 1789896434,
    "pre_consumed_quota": 300000,
    "tasks": [
      { "index": 0, "status": "queued" },
      { "index": 1, "status": "queued" }
    ]
  }
}
```

> **受理阶段不会返回 `song_id`。** 此时还不存在真实歌曲 ID，`request_id` 和 `tasks[].index`
> 都不是歌曲 ID，请不要把它们当作 `song_id` 保存。真实 `song_id` 会在下面的进度查询里出现。

### 查询受理进度

**接口地址**：`GET /api/music/requests/{request_id}`（免费，用同一个 API Key 认证）

```bash
curl "https://www.suno-api.io/api/music/requests/ac_20260920092714315816800d76fv3nq" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

```json
{
  "success": true,
  "data": {
    "request_id": "ac_20260920092714315816800d76fv3nq",
    "status": "processing",
    "tasks": [
      { "index": 0, "status": "processing", "song_id": "f3fa09f5-3d55-4953-826c-0d23f043ec57" },
      { "index": 1, "status": "processing", "song_id": "5fcafe3e-3fae-4d64-8f66-c01bc027b0c3" }
    ]
  }
}
```

`status` 的取值与含义：

| status | 含义 |
|---|---|
| `queued` | 已受理，还没登记到具体歌曲（`tasks` 可能为空数组） |
| `processing` | 已提交生成 |
| `partial` | 两条里已有一条完成 |
| `completed` | 两条都完成，`tasks[].song_id` 可读 |
| `failed` | 提交失败，**费用已全额退回**，`error_message` 给出原因 |

单个任务还有自己的 `tasks[].status`，取值与[歌曲查询 API](current-music-query.md) 一致：
`pending`（已提交、生成中）、`processing`、`completed`、`failed`。任务项里还可能带 `title`、
`duration`，以及已经登记的 `audio_url`；没有就是尚未生成。

拿到真实 `song_id` 之后，按 [歌曲查询 API](current-music-query.md) 或下载接口继续即可。

### Python 示例

```python
import time
import requests

BASE = "https://www.suno-api.io"
HEADERS = {"Authorization": "Bearer YOUR_API_KEY", "Content-Type": "application/json"}

accepted = requests.post(
    f"{BASE}/api/music/create",
    headers={**HEADERS, "Idempotency-Key": "your-own-unique-key"},
    json={"description": "一首轻快的流行歌曲", "model": "suno-v6", "accept_mode": "async"},
    timeout=300,
).json()["data"]

request_id = accepted["request_id"]
while True:
    time.sleep(5)
    progress = requests.get(
        f"{BASE}/api/music/requests/{request_id}", headers=HEADERS, timeout=60
    ).json()["data"]
    if progress["status"] in ("completed", "failed"):
        print(progress)
        break
```

### 兼容性与注意事项

- **不带 `accept_mode` 时，行为与以前完全一致**：同步等待、返回 `200` 和歌曲数组。既有接入方不需要改任何代码。
- 该开关目前只在 `POST /api/music/create` 和 `POST /api/music/create/custom` 生效，其它生成类接口暂不支持。
- 建议同时带上 `Idempotency-Key`（自定义的唯一字符串，≤128 字符）：同一个 key 重复提交只会受理一次，重放返回同一份回执，不会重复扣费。异步模式下这一点尤其重要。
- 开启 `accept_mode=async` 时 `wait_completion` 会被忽略（回执立即返回，不等出歌）。
- 费用仍然在受理时预扣；生成失败会自动全额退回。
- **文本字段长度上限**：`description` 最多 **3000**（按 UTF-16 码元计，emoji 算 2），超长直接返回 HTTP `400`、不进入生成也不扣费，错误信息会带实测字数，例如 `description must not exceed 3000 characters; received 4120`。本接口没有歌词/风格字段；带这些字段的专业模式见[专业模式生成 API](current-music-create-custom.md)的「文本字段长度上限」。通用约定见[新版 API 总览](current-overview.md)的「文本字段长度上限」。
- **不传 `references` 时，行为、价格与响应与以前完全一致**：既有接入方不需要改任何代码。
- 挂了参考素材（尤其是多首参考歌曲）时，建议改用 `accept_mode=async` 受理回执模式，避免同步接口长时间等待；参考素材的准备耗时取决于素材数量与来源。

## 下一步

如果返回时歌曲还未完成，请使用 [歌曲查询 API](current-music-query.md) 查询最终结果。

## Node/Electron 接入案例

如果在 Electron 主进程、Node.js 服务端或桌面客户端中对接普通生成，推荐按下面的流程实现：

1. 调用 `POST /api/music/create` 创建生成任务。
2. 从响应里读取 `song_id` 或 `id`。
3. 每隔 2 秒调用 `POST /api/music/query` 查询状态。
4. 查询结果中出现 `audio_url` 后，认为生成完成。

不要继续使用旧路径 `POST /api/generate` 或 `GET /api/clip?id=...`，这些不是当前推荐的公开接入路径。

```js
const http = require('http');
const https = require('https');

const BASE_URL = 'https://www.suno-api.io';
const MODEL = 'suno-v6';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(urlString, apiKey, body) {
  const url = new URL(urlString);
  const transport = url.protocol === 'https:' ? https : http;
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          const data = raw ? JSON.parse(raw) : {};

          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Suno API request failed: HTTP ${res.statusCode} ${raw}`));
            return;
          }

          resolve(data);
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getPayload(response) {
  return response && response.data !== undefined ? response.data : response;
}

function toSongList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.songs)) return payload.songs;
  if (Array.isArray(payload?.clips)) return payload.clips;
  return payload ? [payload] : [];
}

function collectSongIds(createResponse) {
  return toSongList(getPayload(createResponse))
    .map((song) => song.song_id || song.id)
    .filter(Boolean);
}

async function generateSunoSong({ apiKey, description, instrumental = false }) {
  const createResponse = await requestJson(`${BASE_URL}/api/music/create`, apiKey, {
    description,
    model: MODEL,
    instrumental,
    wait_completion: false,
  });

  const songIds = collectSongIds(createResponse);
  if (songIds.length === 0) {
    throw new Error(`Suno API did not return song ids: ${JSON.stringify(createResponse)}`);
  }

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);

    const queryResponse = await requestJson(`${BASE_URL}/api/music/query`, apiKey, {
      song_ids: songIds,
      model: MODEL,
    });

    const songs = toSongList(getPayload(queryResponse));
    const completed = songs.find((song) => song.audio_url);

    if (completed) {
      return {
        audioUrl: completed.audio_url,
        title: completed.song_title || completed.title || 'Suno Song',
        duration: completed.duration,
      };
    }

    const allFailed = songs.length > 0 && songs.every((song) =>
      ['failed', 'error', 'rejected'].includes(String(song.status || '').toLowerCase())
    );

    if (allFailed) {
      throw new Error(`Suno generation failed: ${JSON.stringify(songs)}`);
    }
  }

  throw new Error('Suno generation timed out after 120 seconds. Please query again later.');
}

// Usage:
// generateSunoSong({
//   apiKey: process.env.SUNO_API_KEY,
//   description: 'A bright pop song about the ocean in summer',
// }).then(console.log).catch(console.error);
```

实际项目中建议把 API Key 放在服务端环境变量、桌面客户端设置或安全存储中，不要写进前端代码，也不要提交到代码仓库。
