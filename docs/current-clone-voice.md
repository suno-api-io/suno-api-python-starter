# 【推荐】克隆音色 API

> **✅ 推荐新接入使用本链路。** 根据大量用户的实际评测，这条链路生成的歌曲**原声还原度较高**，成品里的人声更接近你上传样本中的本人音色，因此作为当前的首选链路对外推荐。
>
> 对照：早期的[人声克隆与指定人声生成 API（不推荐）](current-voice-clone.md) 仍然可用，但导航里已标注「不推荐」，不再推荐新接入。

- 文档日期：2026-09-26
- 覆盖能力：创建自己的音色 → 用音色翻唱指定歌曲 / 用音色唱新歌 → 查询进度 → 下载成品
- 全文接口、字段与响应都经过真实调用验证（下文标注「实测」的为重点验证项）

> 说明：本文档只描述你需要调用的接口。素材处理、任务调度、内容校验等环节都由服务端自动完成，客户端无需实现。

---

## 0. 五分钟上手

只要四步，就能从一段人声样本拿到两首成品歌。

```text
① 创建音色    POST /api/music/voice-profile/create      → 拿到 voice_id（status=ready）
② 用音色翻唱  POST /api/music/voice-profile/cover       → 立刻拿到 2 个 song_id
③ 查询进度    POST /api/music/query                     → 轮询到 status=completed
④ 下载成品    GET  /api/music/download?song_id=…&kind=mp3
```

最小可用示例（curl）：

```bash
API_KEY="sk-你的密钥"
BASE="https://www.suno-api.io"

# ① 创建音色（上传一段人声样本，建议 10 秒以上、10MB 以内）
curl -sS -X POST "$BASE/api/music/voice-profile/create" \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@./my-voice.mp3" \
  -F "title=我的音色" \
  -F "source_kind=upload"
# → {"success":true,"message":"","data":{"voice_id":"vp_2026…","status":"ready", …}}

# ② 用这个音色翻唱一首歌（song_clip_id = 要翻唱的那首歌的 clip id）
curl -sS -X POST "$BASE/api/music/voice-profile/cover" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-Create-Ui-Client-Request-Id: cover-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{
        "model": "suno-v6",
        "voice_id": "vp_2026…",
        "song_clip_id": "5b773e9a-…",
        "lyrics": "[Verse 1]\n歌词正文…",
        "style_requirements": "慢速民谣，木吉他",
        "audio_weight": 0.85,
        "max_mode": false
      }'
# → {"code":200,"message":"success","data":{"resolved_scene":"cover","clips":[{…},{…}]}}

# ③ 轮询（一次传多个 id，用英文逗号分隔）
curl -sS -X POST "$BASE/api/music/query" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"suno-v6","song_ids":"id1,id2"}'

# ④ 完成后下载 mp3（status=completed 才能拿到文件）
curl -sS -L "$BASE/api/music/download?song_id=id1&kind=mp3" \
  -H "Authorization: Bearer $API_KEY" -o song1.mp3
```

---

## 1. 公共约定

### 1.1 域名与环境

| 环境 | Base URL | 用途 |
| --- | --- | --- |
| 生产 | `https://www.suno-api.io` | 正式对客 |

下文所有路径都相对 Base URL，例如 `POST /api/music/voice-profile/create` 的完整地址是
`https://www.suno-api.io/api/music/voice-profile/create`。

### 1.2 鉴权

所有接口都用同一个请求头，值就是你在控制台创建的 API Key：

```http
Authorization: Bearer sk-xxxxxxxx
```

- `Bearer ` 前缀可带可不带；`sk-` 前缀可带可不带（`Authorization: sk-xxx` 同样有效）。
- Key 缺失或无效 → HTTP 401，响应体形如 `{"success":false,"message":"…"}`（文案随请求语言变化）。
- 每个 Key 只能看到、只能操作**自己账号**的歌曲与音色。

### 1.3 请求体格式

- 创建音色：推荐 `multipart/form-data`（上传文件），也支持 `application/json`（传 URL 或 base64）。
- 其余接口：`application/json`。

### 1.4 两种响应外壳（**对客只需认这两种**）

「音色管理」类接口（create / create-from-clip / list / detail / delete）用**业务外壳**：

```json
{ "success": true, "message": "", "data": { } }
```

```json
{ "success": false, "message": "voice_id is required" }
```

「音色翻唱」走生成通道，用**生成外壳**：成功是 `code/message/data`，失败是 `error` 对象：

```json
{ "code": 200, "message": "success", "data": { } }
```

```json
{ "error": { "message": "voice not found: vp_xxx", "type": "bad_response_status_code", "param": "", "code": "bad_response_status_code" } }
```

判定建议：先看 HTTP 状态码，再看 `success === false`，最后看 `code !== 200` 或是否存在 `error`。
**业务失败不保证 HTTP 非 200**（音色管理类接口出错时 HTTP 仍是 200），所以不能只看 HTTP 状态码。

### 1.5 幂等

**创建音色（含「从已有音频创建」）是真正幂等的**：同一个 Key 下，同一个 `client_request_id` 重复提交只会建一条音色，第二次直接返回第一次的结果（`success=true`、同一个 `voice_id`）。用法是客户端自己生成一个 id（例如 UUID），超时重试时复用同一个值。

**翻唱提交不做请求级去重**（它是一次计费生成），请注意两点：

1. 提交标识放在请求头 `X-Create-Ui-Client-Request-Id: <你的提交 id>`。它会写进服务端任务记录，便于事后排查；它**不会**阻止重复扣费。
2. 提交超时 ≠ 失败：请求可能已经被受理并在生成。重试前建议先 `GET /api/music/songs?p=1&page_size=20`（分页参数是 `p` / `page_size`，也可用兼容写法 `ps`）看最近是否已经出现 `generation_type=voice_profile_cover` 的新歌，确认没有再把同样的请求重发一次。

`create` 与 `create-from-clip` 的 body 里也用 `client_request_id` 字段（见 §3、§4）。

### 1.6 计费总览

| 动作 | 接口 | 价格 | 说明 |
| --- | --- | --- | --- |
| 创建音色（普通） | `POST /api/music/voice-profile/create` | **免费** | 上传样本不消耗 Suno 额度 |
| 创建音色（从已有音频） | `POST /api/music/voice-profile/create-from-clip` | **免费** | 服务端只登记素材引用，不重新上传 |
| 强化克隆 | 同上，`enhanced=true` | 按「强化上传价」（默认 10 元/次） | 异步，失败自动退款 |
| 音色翻唱 | `POST /api/music/voice-profile/cover` | **1.2 元/次**；`max_mode=true` 时 **2.4 元/次** | 一次返回 2 首 |
| 查询 / 列表 / 详情 / 删除 | — | **免费** | |
| 下载（自行取直链） | 响应里的 `audio_url` | 免费 | 直接播放下发地址 |
| 下载（转 wav / 歌词等） | `POST /api/music/free2` | 0.2 元/成功首 | 见 §8 |

价格随时可通过公开接口读取，不要写死（见 §9）：

```bash
curl -sS https://www.suno-api.io/api/pricing/catalog | jq '.data.catalog.meta'
# {
#   "generation_price": "0.6",
#   "voice_generation_price": "1.2",      ← 音色翻唱基准价
#   "max_mode_factor": "2",
#   "enhanced_upload_price": "10",        ← 强化克隆价
#   "voice_auto_verify_price": "5",
#   "voice_long_term_clone_price": "5"
# }
```

翻唱采用**预扣费 + 失败退款**：

- 请求被拒绝（参数错误、平台 4xx/5xx、余额不足本身）**不会扣费**——实测用不存在的音色提交后余额完全不变（delta = 0）；
- 已受理的任务最终失败（含平台服务异常）会走服务端退款链路退回预扣金额。

### 1.7 状态字典

音色的 `status`：

| 值 | 含义 | 可用来翻唱 |
| --- | --- | --- |
| `ready` | 已就绪 | ✅ |
| `processing` | 仅强化克隆（`enhanced=true`）会出现，正在处理 | ❌（要等 ready） |
| `failed` | 创建失败，看 `error_message`；强化克隆已退款 | ❌ |

歌曲的 `status`（查询接口返回值）：

| 值 | 含义 | 可下载 |
| --- | --- | --- |
| `submitted` / `queued` / `processing` | 生成中（可能已有试听流） | ❌ |
| `completed` | 完成 | ✅ |
| `failed` | 失败，费用已退回 | ❌ |

---

## 2. 接口总览

| # | 方法 | 路径 | 作用 | 计费 |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/music/voice-profile/create` | 创建音色（上传 / URL / base64） | 免费（`enhanced=true` 除外） |
| 2 | POST | `/api/music/voice-profile/create-from-clip` | 用自己已有的音频创建音色 | 免费 |
| 3 | GET | `/api/music/voice-profile/list` | 音色列表 | 免费 |
| 4 | GET | `/api/music/voice-profile/{voice_id}` | 音色详情（含强化克隆进度） | 免费 |
| 5 | POST | `/api/music/voice-profile/delete` | 删除音色 | 免费 |
| 6 | POST | `/api/music/voice-profile/cover` | 用音色翻唱 / 唱新歌 | 1.2 元（MAX 2.4） |
| 7 | POST | `/api/music/query` | 批量查询歌曲状态 | 免费 |
| 8 | GET | `/api/music/songs/{song_id}` | 单首详情 | 免费 |
| 9 | GET | `/api/music/download` | 下载成品文件 | 免费（mp3/播放链接） |
| 10 | POST | `/api/music/free2` | 转 wav / 歌词等 | 0.2 元/成功首 |
| 11 | POST | `/api/music/free2/cached` | 取已归档的下载地址 | 免费 |
| 12 | GET | `/api/music/songs` | 我的作品列表（分页） | 免费 |

---

## 3. 创建音色

```http
POST /api/music/voice-profile/create
```

把一段人声音频登记成「音色」，得到 `voice_id`。音色对平台而言就是「一段音频 + 它在曲库里的 clip」，因此创建成功后**这段源音频永久保留**（用于后续翻唱）。

### 3.1 三种入参形态（任选其一）

**形态 A：multipart 上传文件（推荐）**

```http
Content-Type: multipart/form-data

file=<音频二进制>          # 必填
title=<音色名称>            # 可选，空则取文件名去掉扩展名
file_name=<原始文件名>
source_file_name=<原始文件名>
source_kind=upload|record   # 可选，来源标记（上传 / 录制），缺省 upload
enhanced=false|true         # 可选，true = 强化克隆（见 §3.5）
client_request_id=<幂等键>   # 可选
voice_id=<自定义 ID>         # 可选，一般不用
```

```bash
curl -sS -X POST "https://www.suno-api.io/api/music/voice-profile/create" \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@./my-voice.mp3;type=audio/mpeg" \
  -F "file_name=my-voice.mp3" \
  -F "source_file_name=my-voice.mp3" \
  -F "title=我的音色" \
  -F "source_kind=upload"
```

**形态 B：JSON + 公网音频 URL**

```bash
curl -sS -X POST "https://www.suno-api.io/api/music/voice-profile/create" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "file_url": "https://your-cdn.example.com/voice/my-voice.mp3",
        "file_name": "my-voice.mp3",
        "title": "我的音色"
      }'
```

- URL 必须是公网可访问的直链 HTTPS 地址，服务端会下载一次并转存到我们的对象存储。
- 也可以把地址放在 `audio_url` 字段，效果等价（两者都传时以 `file_url` 为准）。
- 已经是本平台对象存储地址（`*.myqcloud.com/create-ui/voice-source/...`）时不会重复下载，直接登记。

**形态 C：JSON + base64**

```json
{
  "file_base64": "data:audio/mpeg;base64,//uQxAAA…",
  "file_name": "my-voice.mp3",
  "title": "我的音色"
}
```

- 支持 `data:audio/xxx;base64,` 前缀，也支持纯 base64。
- 体积受限（base64 会放大 1.33 倍），大文件请用形态 A。

### 3.2 音频要求

| 项 | 要求 | 备注 |
| --- | --- | --- |
| 体积 | ≤ 10MB | 超限会在网关被截断，表现为「被 Suno 拒绝」，请先压缩或剪短 |
| 时长 | 最少 6 秒；**建议 10–60 秒** | 不足 6 秒会被平台拒绝：`Uploaded audio is too short (currently 2.4 seconds). Minimum duration is 6 seconds.` |
| 格式 | mp3 / wav / m4a / aac / flac / ogg | 以文件扩展名判定 |
| 内容 | 干净人声，避免翻唱成品 / 带伴奏的原曲 | 与曲库已有录音高度相似会被拒绝：`This audio matches an existing recording in our catalog.`（实测） |

### 3.3 响应

```json
{
  "success": true,
  "message": "",
  "data": {
    "voice_id": "vp_20260926080618509168500DXXrxe",
    "clip_id": "91cc5935-389f-4193-b56b-cc796c15562d",
    "song_id": "91cc5935-389f-4193-b56b-cc796c15562d",
    "account_id": "acc_1790085275308",
    "title": "我的音色",
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

字段说明（`create` / `list` / `detail` 三个接口共用同一套字段）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `voice_id` | string | **音色 ID**，后续翻唱用它 |
| `clip_id` / `song_id` | string | 该音色音频在 Suno 侧的 clip id（两者相同），排查用 |
| `account_id` | string | 承接账号标识（排查用，客户端无需关心） |
| `title` | string | 音色名称 |
| `source_file_name` | string | 原始文件名 |
| `audio_url` | string | **源音频的长期直链**，可用于试听；永久保留 |
| `image_url` | string | 音色封面（Suno 为人声音频生成的封面）；没有封面时**该键整个不出现** |
| `duration_s` | number | 音色样本时长（秒） |
| `enhanced` | bool | 是否强化克隆创建 |
| `source_kind` | string | `upload`（上传）/ `record`（录制）/ `clip`（取自已有音频） |
| `status` | string | `ready` / `processing` / `failed` |
| `error_message` | string | 失败原因，仅 `failed` 时出现 |
| `task_id` | number | 强化克隆的底层任务号，仅 `enhanced=true` 时有值 |
| `pre_consumed_quota` | number | 预扣费额度（仅强化克隆有值） |
| `created_at` / `updated_at` | number | Unix 秒 |

> `created_at` / `updated_at` 是**秒**级时间戳（10 位），不是毫秒。

### 3.4 常见错误

| HTTP | message | 原因与处理 |
| --- | --- | --- |
| 200 | `one of file_path, file_base64, or file_url is required` | 没有带上音频内容 |
| 200 | `Uploaded audio is too short (currently 2.4 seconds). Minimum duration is 6 seconds.` | 样本太短，换 ≥6 秒（建议 ≥10 秒） |
| 200 | `This audio matches an existing recording in our catalog.` | 样本与曲库已有录音高度相似，换一段干净的干声 |
| 200 | `upload succeeded without clip or account identity` | 平台回包异常，重试 |
| 200 | `audio file exceeds 30 MB limit` | 超过服务端上限（对客实际请按 10MB 控制） |
| 401 | `无效的令牌` | API Key 错误 |

### 3.5 强化克隆（`enhanced=true`）

用于「音色样本本身带有版权歌词 / 需要做加强上传」的场景，价格按强化上传价（默认 10 元/次，失败自动退款）：

- 返回立刻是 `status=processing` + `task_id`（此时还没有 `clip_id`），异步执行；
- 处理期间用 `GET /api/music/voice-profile/{voice_id}` 查进度，会返回 `progress_percent` / `progress_stage` / `progress_message`；
- 完成后 `status` 变 `ready`，`clip_id`、`audio_url`、`image_url` 补齐；
- 失败则 `status=failed`，`error_message` 形如「强化上传失败，费用已自动退回，请稍后重试。」；
- 强化克隆耗时明显长于普通创建（分钟级），请勿用同步超时逻辑等待。

```bash
curl -sS -X POST "https://www.suno-api.io/api/music/voice-profile/create" \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@./my-voice.mp3" -F "title=我的音色" -F "enhanced=true"
```

---

## 4. 用已有音频创建音色

如果你不想重新上传：把自己**已经上传或已经生成**的一段音频直接复制成音色。免费、幂等。

```http
POST /api/music/voice-profile/create-from-clip
Content-Type: application/json

{
  "source_song_id": "97ee62fe-56cd-473f-a2f5-c66ac0766a2e",
  "title": "徐清 强",
  "client_request_id": "vp-clip-1789…"
}
```

- `source_song_id`：你名下一段**已完成**音频的 clip id（等同于歌曲的 `song_id`）。
- 同一个 clip 重复提交不会新建记录，直接返回已有音色并带 `reused: true`（实测）。

响应 = §3.3 的全部字段，另加两个只读字段：

| 字段 | 说明 |
| --- | --- |
| `reused` | `true` = 这个音频之前已经是你的音色，本次直接复用 |
| `source_type` | 该音频的来源类型：`generate` / `custom_generate` / `voice_generate` / `upload_source` / `enhanced_upload` |

```json
{
  "success": true,
  "data": {
    "voice_id": "vp_20260926081712557959800Z5gvlt",
    "clip_id": "97ee62fe-56cd-473f-a2f5-c66ac0766a2e",
    "title": "徐清 强",
    "status": "ready",
    "enhanced": true,
    "reused": true,
    "source_type": "enhanced_upload"
  }
}
```

错误（`message` 原文，建议直接展示或做本地化）：

| message | 含义 |
| --- | --- |
| `source audio not found` | clip 不存在或不属于你 |
| `source audio is invalid` | 该音频还在生成中 / 是中间产物，尚不可用 |
| `source_song_id is required` | 没传 `source_song_id` |

---

## 5. 音色列表 / 详情 / 删除

### 5.1 列表

```http
GET /api/music/voice-profile/list
GET /api/music/voice-profile/list?include_deleted=true
```

```json
{
  "success": true,
  "message": "",
  "data": {
    "items": [ { "voice_id": "vp_…", "title": "我的音色", "status": "ready", "audio_url": "…", "image_url": "…" } ],
    "total": 1
  }
}
```

字段与 §3.3 完全一致。默认不返回已删除的音色。

### 5.2 详情

```http
GET /api/music/voice-profile/{voice_id}
```

返回单个音色对象（`data` 为对象本身，不是数组）。强化克隆在处理中时，会额外带上：

| 字段 | 说明 |
| --- | --- |
| `progress_percent` | 0–100 的整数 |
| `progress_stage` | 阶段标识，例如 `media_preparing` |
| `progress_message` | 给用户看的中文进度文案 |

### 5.3 删除

```http
POST /api/music/voice-profile/delete
Content-Type: application/json

{ "voice_id": "vp_2026…" }
```

```json
{ "success": true, "message": "", "data": { "voice_id": "vp_2026…", "status": "deleted" } }
```

- 删除后音色从列表里消失，**不能再用于新的翻唱**：继续拿这个 `voice_id` 提交会返回 400（见 §6.4）。
- **已经用它生成过的歌完全不受影响**，播放、下载、续写、替换、分轨照旧。
- 删除不存在的音色、或不属于本账号的音色，返回 `{"success":false,"message":"voice not found"}`。

---

## 6. 用音色翻唱（核心接口）

```http
POST /api/music/voice-profile/cover
Content-Type: application/json
```

一次提交 **生成 2 首**（与普通生成一致）。

### 6.1 两种场景

| 场景 | 触发条件 | 说明 |
| --- | --- | --- |
| **A 翻唱指定歌曲** | 传了 `song_clip_id` | 用你的音色去唱这首歌（旋律 / 节奏 / 段落沿用原曲，人声换成你的音色） |
| **B 用音色唱新歌** | 不传 `song_clip_id` | 只给音色 + 歌词（可选）+ 风格要求，让模型按风格全新创作旋律后演唱 |

响应里的 `resolved_scene` 会回显 `cover` 或 `sing`，便于你确认走了哪条路。

### 6.2 请求字段

| 字段 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `model` | string | **是** | — | 对客模型名，见 §6.5。**不传会报 `model is required`（HTTP 500）** |
| `voice_id` | string | 二选一 | — | 音色 ID（`vp_…`），必须 `status=ready` |
| `voice_clip_id` | string | 二选一 | — | 也可以直接用音色的 clip id；两者都传时以 `voice_id` 为准 |
| `song_clip_id` | string | 否 | 空 | 要翻唱的那首歌的 clip id（`song_id`）。不传 = 场景 B |
| `lyrics` | string | 否 | 空 | 歌词全文，**逐字上送，不做改写 / 截断**；≤ 5000（v6 档，按 UTF-16 码元） |
| `cover_requirements` | string | 否 | 空 | 翻唱要求（自然语言），例如「咬字更清晰一些」。会拼进固定提示词 |
| `style_requirements` | string | 否 | 空 | 风格要求，例如「慢速民谣，木吉他」 |
| `title` | string | 否 | 空 | 这两首成品在工作区里的标题（会影响后续查询返回的 `song_title`） |
| `negative_tags` | string | 否 | 空 | 排除风格，例如 `电子, 说唱`；≤ 1000 字符 |
| `vocal_gender` | string | 否 | 空 | `m` / `f`（也接受 `male` / `female`）；空 = 不限 |
| `duration` | number | 否 | 空 | 期望时长（秒），**1–480 的整数**；空 = 平台自动。**平台实际最短约 30 秒**：填更小的值实测也只能得到约 30 秒的成品 |
| `audio_weight` | number | 否 | **0.85** | 音频参考度，0–1 小数。越高越贴近音色样本 |
| `style_weight` | number | 否 | 空 | 风格影响，0–1 小数 |
| `weirdness_constraint` | number | 否 | 空 | 创意度，0–1 小数（界面若用百分比，请先除以 100） |
| `variety` | number | 否 | 空 | 多样性，**0–4 的整数**（不是百分比），仅 v6 系列支持 |
| `max_mode` | boolean | 否 | `false` | Max Mode，价格 ×2 |
| `client_request_id` | string | 否 | 空 | 提交标识，写入服务端任务记录用于排查（**不做去重**） |

**建议同时带上请求头 `X-Create-Ui-Client-Request-Id: <同一个提交 id>`**：它才会写进服务端任务记录，是事后排查的主键（详见 §1.5）。

量纲提醒：`audio_weight` / `style_weight` / `weirdness_constraint` 是 **0–1 小数**，`variety` 是 **0–4 整数**，`duration` 是**秒**。混用会被拒绝或效果异常。

场景 B 的歌词可选（模型会自行处理），但要唱指定内容时请务必传 `lyrics`。

### 6.3 响应

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
        "description": "【任务】这是一次翻唱。…（服务端固定结构段 + 你填写的翻唱/风格要求）"
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

要点：

1. 成品标识用 **`clips[].song_id`**（本接口不回 `id` 字段）。
2. **立刻拿到 2 个 `song_id`**，此时 `status` 还是 `processing`（只代表已受理），`audio_url` 为空；要轮询到 `completed` 才能下载。`play_url` 是平台试听流，提交阶段就可能出现，会过期。
3. `description` 是服务端最终上送的提示词（固定结构段 + 你填写的 `cover_requirements` / `style_requirements`），排查效果时很好用。
4. `source_updates` 是服务端的素材处理结果，客户端可忽略。
5. 你传的 `title` 会写进服务端任务记录，在后续查询里体现为 `song_title`；提交回包的 `clips[].song_title` 通常为空，属正常。

### 6.4 错误

```json
{ "error": { "message": "该音色不存在或已被删除（voice_id=vp_xxx）…", "type": "new_api_error", "param": "", "code": "invalid_request" } }
```

| HTTP | message | 原因 |
| --- | --- | --- |
| 500 | `model is required` | 请求体缺 `model`（这是渠道选择的必需字段） |
| 400 | `voice_id is required and must be a ready voice` | 没传 `voice_id`，或传的是占位值 / 未就绪音色 |
| 400 | `该音色不存在或已被删除（voice_id=vp_xxx）…` | 音色已删除、不存在，或不属于当前账号。请改用其他可用音色，或重新创建一个音色 |
| 400 | `该音色已被删除（voice_id=vp_xxx）…` | 用 `voice_clip_id` 直传素材时，这段素材对应的音色已删除；处理方式同上 |
| 400 | `voice is not ready yet (status=processing)` | 音色还在创建中，等 `ready` 再试 |
| 400 | `song_clip_id must be a real completed clip` | `song_clip_id` 是占位符 / 未完成 |
| 400 | `song_clip_id must differ from the voice clip` | 翻唱对象不能等于音色样本本身 |
| 400 | `audio_weight must be a number between 0 and 1` | 滑块量纲用错（传了百分数） |
| 400 | `duration must be an integer between 1 and 480 seconds` | 时长不是 1–480 的整数 |
| 400 | `vocal_gender must be one of m, f, male, female` | 性别取值非法 |
| 400 | `variety must be an integer between 0 and 4` / `variety is only supported on v6 models` | 多样性取值或模型不支持 |

余额不足会在提交阶段直接返回计费错误，不会产生半成品任务。

### 6.5 可用模型（对客模型名）

| 对客模型名 | 说明 |
| --- | --- |
| `suno-v6` | 默认，推荐 |
| `suno-v6-wild` | 更奔放 |
| `suno-v6-mini` | 轻量 |


---

## 7. 查询进度

### 7.1 批量查询（推荐）

```http
POST /api/music/query
Content-Type: application/json

{ "model": "suno-v6", "song_ids": "id1,id2" }
```

- `song_ids` 是**英文逗号分隔的字符串**（不是数组）。
- 返回是**裸数组**（直接 `[...]`，没有 `success` / `data` 外壳）：

```json
[
  {
    "song_id": "0f2a…",
    "song_title": "两只老虎",
    "status": "completed",
    "audio_url": "https://suno-api-hk-1437223057.cos.ap-hongkong.myqcloud.com/assets/0f2a…-mp3.mp3",
    "cover_url": "https://cdn2.suno.ai/image_0f2a….jpeg",
    "duration": 115.15,
    "model_version": "suno-v6",
    "generation_type": "voice_profile_cover",
    "play_url": "https://media.suno-api.io/play/…?expires=…&signature=…",
    "lyrics": "[Verse 1]…",
    "prompt": "[Verse 1]…",
    "description": "【任务】这是一次翻唱。…（服务端最终提示词）",
    "style_tags": "…",
    "created_at": "2026-09-25T18:19:09.918Z",
    "video_url": ""
  }
]
```

| 字段 | 说明 |
| --- | --- |
| `status` | 见 §1.7；`completed` 才算完成 |
| `audio_url` | mp3 直链，`completed` 后才有值 |
| `cover_url` | 封面地址 |
| `duration` | 实际时长（秒） |
| `generation_type` | 音色翻唱产出的歌固定是 `voice_profile_cover` |
| `play_url` | 带签名试听地址（会过期） |
| `song_title` | 任务标题（即你提交时传的 `title`；不传则由服务端兜底） |
| `lyrics` / `prompt` | 成品歌词 / 歌词原文 |
| `description` | 服务端最终上送的提示词（含固定结构段） |
| `style_tags` | 最终风格描述 |
| `created_at` | **ISO 8601 字符串**（注意与详情接口的 Unix 秒不同） |

轮询建议：**间隔 5–10 秒，总超时 10–15 分钟**（冷账号最慢实测约 4 分半；极少数更久）。不要用 `audio_url` 是否空来判断完成，要用 `status`。

> 兼容提示：本接口以 `song_id` 为标识；早期个别响应里出现过 `id` 字段，稳妥写法是 `row.song_id || row.id`。

### 7.2 单首详情

```http
GET /api/music/songs/{song_id}
```

```json
{
  "success": true,
  "data": {
    "song_id": "0f2a…",
    "title": "两只老虎",
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
      "title": "两只老虎",
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

- `created_at` / `completed_at` 这里是 **Unix 秒**（与批量查询的 ISO 字符串不同，客户端注意区分）。
- `wav_url` / `video_url` 是**本平台的下载入口**（相对当前域名），`GET` 即可取文件；平台没有该产物时为空串。
- `parameter_retention` 说明该歌曲能追溯哪些提交参数：`core_parameters_available=true` 表示歌词 / 风格 / 来源等核心参数可查，`extended_parameters_available=false` 时上面列的扩展参数没有留存（音色翻唱目前属这一类）。

### 7.3 我的作品列表

```http
GET /api/music/songs?p=1&page_size=20
GET /api/music/songs?status=completed&q=关键词
```

分页参数：`p`（页码，从 1 开始）/ `page_size`（每页条数，兼容写法 `ps`）。可选 `status`、`q`（标题关键词）。默认按创建时间倒序。

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
        "title": "两只老虎",
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

用 `generation_type=voice_profile_cover` 可以把「用音色翻唱产出的歌」与其他生成结果区分开。

---

## 8. 下载成品

### 8.1 直接取 mp3（推荐，免费）

三种都可以，任选其一：

1. 用查询结果里的 `audio_url`（对象存储直链，最省事）。
2. `GET /api/music/download?song_id=<id>&kind=mp3` → 直接返回音频字节流（`Content-Disposition` 已带文件名）。
3. `POST /api/music/download-url`（拿带签名的临时地址）。

```bash
curl -sS -L "https://www.suno-api.io/api/music/download?song_id=0f2a…&kind=mp3" \
  -H "Authorization: Bearer $API_KEY" -o song.mp3
```

`kind` 取值：`mp3`（等价于 `song`）/ `playback`（流式播放）/ `wav` / `video` / `lyrics` / `timestamped_lyrics`。
其中 `timestamped_lyrics`（`.lrc`）目前仅部分歌曲支持，失败时请改用 [时间轴歌词 API](current-lyrics-timeline.md) 自行生成。
响应直接是文件字节流，`Content-Type` 与 `Content-Disposition`（文件名）都已带好；`GET /api/music/songs/{song_id}` 返回的 `wav_url` / `video_url` 就是带上 `kind=wav|video` 的同一入口。

### 8.2 转 wav / 取歌词 / 元数据（计费）

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

- `files` 支持：`mp3` / `wav` / `lyrics` / `metadata`，一次最多 10 首。
- **按成功首数计费（0.2 元/首）**；整首失败不计费，某个格式失败只出现在 `songs[].errors`。
- 重新下载之前已经取过的文件，可以先用 **免费** 的 `POST /api/music/free2/cached`（同样的 `song_ids` + `files`）取归档地址；返回里 `songs[].missing_files` 列出没有缓存、需要重新准备的格式。

---

## 9. 价格查询

```http
GET /api/pricing/catalog
```

公开接口，无需鉴权。对客要展示的单价都在 `data.catalog.meta`（字符串）：

| 键 | 含义 | 当前值 |
| --- | --- | --- |
| `generation_price` | 普通生成 | 0.6 |
| `voice_generation_price` | **音色翻唱基准价** | 1.2 |
| `max_mode_factor` | Max Mode 倍率 | 2 |
| `enhanced_upload_price` | 强化克隆 / 强化上传 | 10 |
| `voice_auto_verify_price` | 人声自动验证 | 5 |
| `voice_long_term_clone_price` | 长期音色克隆 | 5 |

价格会在后台调整，**请实时读取，不要写死在客户端**。翻唱实际扣费 = `voice_generation_price` ×（`max_mode` 为真时再 × `max_mode_factor`）。

---

## 10. 限制与注意事项

1. **上传体积**：≤ 10MB（服务端可接受的上限更高，但入口网关在 10MiB 处会截断超大请求体，表现为「被 Suno 拒绝」，请自行先拦）。
2. **样本时长**：最少 6 秒，建议 10–60 秒；过短会被平台拒绝。
3. **样本内容**：干净人声，避免与已有录音高度相似（会被曲库比对拒绝）。
4. **文本上限**：`lyrics` ≤ 5000、`style_requirements` ≤ 1000、`negative_tags` ≤ 1000、`title` ≤ 100（均按 UTF-16 码元计数，emoji 算 2）。
5. **歌词不做改写**：传入什么就唱什么（逐字一致），不做本地截断。
6. **每首歌固定 2 首产出**，不要假设返回 1 首。
7. **源音频永久保留**：音色删除了源音频也不清理；这是为了保证后续翻唱可用与合规追溯。
8. **音色必须 ready**：`processing` 的音色不能用于翻唱。
9. **请求超时**：冷账号首次提交最慢实测约 4 分半，客户端超时请设 ≥ 6 分钟。翻唱**不做请求级去重**，超时后请先核对是否已经产生新歌（§1.5），再决定是否重发。
10. **音色归属**：音色按创建者归属管理；翻唱只接受**已就绪**（`ready`）且**未删除**的音色。不存在、已删除或不属于本账号，都会返回 400：`该音色不存在或已被删除（voice_id=…）`。

---

## 11. 常见问题（FAQ）

**Q1. 创建音色会不会扣钱？**
普通创建与「从已有音频创建」都免费；只有翻唱（1.2 元 / MAX 2.4 元）和强化克隆（默认 10 元）计费。

**Q2. 音色样本能不能用带伴奏的成品歌？**
不建议。带音乐或与曲库已有录音高度相似会被平台拒绝（`This audio matches an existing recording in our catalog.`）。请用纯人声干声。

**Q3. 为什么提交翻唱后 `audio_url` 是空的？**
提交只代表已受理，`status` 还是 `processing`。轮询 `/api/music/query` 到 `status=completed` 后才有可播 / 可下载地址。

**Q4. 场景 B（不传 `song_clip_id`）要不要传歌词？**
可选。要唱指定内容就传 `lyrics`；不传时模型会自行处理，但可控性较差。

**Q5. 客户自己上传的音频能直接当音色吗？**
可以：`create` 的 `file_url` 形态，或先上传成歌曲再调 `create-from-clip`。

**Q6. 失败了会退钱吗？**
被直接拒绝的请求（参数错误 / 平台报错）实测**不扣费**；已受理但最终失败的任务会退回预扣金额。终态失败时任务返回 `status=failed` 与 `error_message`。

**Q7. 删除音色后，之前用它生成的歌还能听吗？**
能。删除只影响这个音色能否继续用于**新的**翻唱。

**Q8. 一次能翻唱多长的歌？**
`duration` 传 1–480 秒；不传则由平台按原曲 / 素材自动决定。注意**平台的成品最短约 30 秒**：填小于 30 秒的值，实测出来仍是 29.96 / 29.76 秒。

---

## 附录 A：完整调用示例（Node.js，含轮询与下载）

```js
const BASE = "https://www.suno-api.io";
const KEY = process.env.SUNO_API_KEY;
const H = { Authorization: `Bearer ${KEY}` };

// ① 创建音色（multipart）
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

// ② 翻唱
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
      style_requirements: "慢速民谣，木吉他",
      audio_weight: 0.85,
      max_mode: false,
      client_request_id: submissionId,
    }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  return body.data; // { resolved_scene, clips: [{ song_id, status }] }
}

// ③ 轮询到完成（5 秒一次，最多 15 分钟）
async function waitUntilCompleted(songIds) {
  const deadline = Date.now() + 15 * 60 * 1000;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/api/music/query`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "suno-v6", song_ids: songIds.join(",") }),
    });
    const songs = await res.json(); // 裸数组
    if (songs.every((s) => s.status === "completed" || s.status === "failed")) return songs;
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("timeout waiting for cover");
}

// ④ 下载
async function download(songId, outPath) {
  const res = await fetch(`${BASE}/api/music/download?song_id=${encodeURIComponent(songId)}&kind=mp3`, { headers: H });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  (await import("node:fs/promises")).writeFile(outPath, Buffer.from(await res.arrayBuffer()));
}

const voice = await createVoice("./my-voice.mp3", "我的音色");
const result = await cover(voice.voice_id, "5b773e9a-a035-4134-a4a4-29c9961d3ccb", "[Verse 1]\n歌词…");
const ids = result.clips.map((c) => c.song_id);
const songs = await waitUntilCompleted(ids);
for (const [i, s] of songs.entries()) {
  if (s.status === "completed") await download(s.song_id, `./out-${i}.mp3`);
}
```

## 附录 B：变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-10-15 | 删除语义写实（§5.3）；翻唱对「已删除 / 越权」的 `voice_id` 会在预扣费前直接 400，错误表与 FAQ 同步（配合当日上线的音色删除门禁） |
| 2026-10-13 | 开头补充「为什么推荐本链路」说明：据大量用户实际评测，本链路生成歌曲的原声还原度较高 |
| 2026-09-26 | 首版：创建音色（三种入参）/ 已有音频创建 / 列表详情删除 / 音色翻唱（A、B 场景）/ 进度查询 / 下载 / 价格读取，含实测证据 |
