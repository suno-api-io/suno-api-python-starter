# Suno API 接口文档总览

邮箱注册即可创建 API Key，生成接口 0.6 元一次、返回 2 首歌，支持 MP3/WAV 下载、翻唱、续写、分轨与人声克隆；接口基址 `https://www.suno-api.io`。

本页说明当前可用的模型、全部生成与编辑接口、计费方式和推荐接入顺序；新接入建议按这里的顺序往下读，遇到 401/403/429 也有对应的排查入口。

> **Suno API 使用什么模型？** 我们使用 Suno 官方模型提供 HTTP API。无需自行申请 Suno 账号，在本站注册后即可创建 API Key，直接调用官方模型的音乐生成能力；Key、计费与限流由本站统一管理。

## 常见问题速查

**API Key 怎么获取？** 用邮箱注册后进入控制台 → 令牌管理，新建一个令牌即可，不需要手机号，也不用绑卡。

**多少钱一次？** 生成接口 0.6 元一次、返回 2 首歌；查询状态、WAV、时间轴歌词、提示词建议等接口不额外收费。

**支持哪些模型？** `suno-v6`（默认）、`suno-v6-wild`、`suno-v6-mini`；v5.5 及更早的普通生成模型已下线，历史作品不受影响。

**接口地址是什么？** `https://www.suno-api.io`，请求头带 `Authorization: Bearer YOUR_API_KEY`。

## 当前支持的模型

普通歌曲生成接口的对客模型只有 `suno-v6`、`suno-v6-wild` 和 `suno-v6-mini`，不填写 `model` 时默认使用 `suno-v6`。

普通模型 `suno-v2`、`suno-v3`、`suno-v3-5`、`suno-v4`、`suno-v4-5`、`suno-v4-5-all`、`suno-v4-5-plus`、`suno-v5`、`suno-v5-5` 已下线。查询历史任务时仍可能看到旧模型名，这只表示历史数据，不表示旧模型仍可用于新建请求。分轨接口是例外，详见[分轨（人声伴奏分离）API](current-music-separate.md)。

## 认证方式

所有对外 API Key 接口统一使用：

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

接口基础地址：

```text
https://www.suno-api.io
```

## 通用参数填写约定

- 请求体中的 `number` 必须传 JSON 数字，不能传百分数字符串。例如强度 50% 应写成 `0.5`，不能写成 `50` 或 `50%`。
- 请求体中的 `boolean` 必须传 `true` 或 `false`，不要传 `true`、`false`、`0`、`1` 等替代值。
- 标记为“否”的字段可以完全不传。不确定参数含义时，优先省略字段，让服务使用默认行为；不要用空字符串、`null` 或 `0` 代替“未传”，因为 `0` 在部分数值字段中是有效值。
- 字段名区分拼写。各接口文档会列出推荐字段和兼容字段；新接入请按参数表原样传递。若文档说明 snake_case 与 camelCase 同时兼容，二者不要同时传。
- 所有以 `_s`、`Seconds` 结尾的时长字段单位均为秒，可以使用小数；Unix 时间戳会单独注明是秒级还是毫秒级。
- `pending:` 开头的 ID 是平台占位 ID，不是真实歌曲 ID。只有接口明确说明支持占位 ID 时才能使用，否则应等待返回真实 `song_id`。

### 文本字段长度上限

文本字段超限会**直接返回 HTTP `400`**：不会进入生成、不会预扣费、也不会产生任务记录。

计数口径与 Suno 网页端完全一致：**按 UTF-16 码元（等价 JS 的 `String.length`）**——常用中文/英文算 1，emoji 与增补平面生僻字算 2；**不做 trim**，行首行尾空格、制表符、换行（`\n` 算 1）全部计入。

上限随**请求里声明的模型**变化（与上游 `models[].max_lengths` 一致）：

| 字段（含兼容写法） | `suno-v6` / `v6-wild` / `v6-mini`（含不传） | `suno-v4` / `v3.5` / `v3` / `v2` |
|---|---:|---:|
| 歌词 `prompt` / `lyrics` / `song_lyrics` / `attached_lyrics` | **5000** | **3000** |
| simple 提示词 `description`（`/api/music/create`）/ `gpt_description_prompt` | **3000** | **3000** |
| 风格 `style_tags` / `tags` / `style` / `original_tags` | **1000** | **200** |
| `negative_tags` | **1000** | **1000** |
| `song_title` / `title` | **100** | **100** |
| `/api/music/sounds` 的 `description` | **100** | **100** |

> 同名字段在不同接口可能走不同档位：`description` 在 `/api/music/create` 是 simple 提示词（3000），在 `/api/music/extend` 会映射成歌词 prompt（v6 = 5000），在 `/api/music/sounds` 则是音效描述（100）。

超限时的 `message` 会直接给出字段名和实测字数，按这两个数字裁剪即可定位：

```json
{
  "error": {
    "message": "style_tags must not exceed 1000 characters; received 2772",
    "type": "invalid_request_error"
  }
}
```

适用接口：`/api/music/create`、`/api/music/create/custom`、`/api/music/sounds`、`/api/music/extend`、`/api/music/concat`、`/api/music/upload-cover`、`/api/music/generate-from-source`、`/api/music/add-instrumental`、`/api/music/add-vocal`、`/api/music/add-stem`、`/api/music/mashup`、`/api/music/sample`、`/api/music/crop`、`/api/music/remove-section`、`/api/music/fade`、`/api/music/reverse`、`/api/music/speed`、`/api/music/inspo`、`/api/music/simple-cover`、`/api/music/voice-profile/cover`、`/api/music/speech`、`/api/music/replace-section`、`/api/music/generate-with-voice`、`/api/lyrics/generate`、`/api/music/boost-style`。

唯一例外：`POST /api/music/sounds` 的 `description`（音效描述）上限是 **100 字符**，走的是平台更短的那条限制。

## 异步生成与音频地址

音乐生成接口默认按异步方式工作。首次响应中的 `status` 为 `pending`、`submitted` 或 `processing` 时，`audio_url`、`video_url`、`cover_url` 为空属于正常现象，不表示任务失败。请保存真实 `song_id` 或接口返回的 `client_request_id`，按对应查询文档轮询；只有状态完成后再读取和下载音频地址。

> **⚠️ 音频地址有效期：7 天，请及时转存**
>
> `audio_url`、`wav_url`、`video_url` 以及各下载接口返回的地址，都由平台的对象存储提供，**默认在 7 天后失效**（文件到期会被回收，继续用旧地址访问会返回 404 / 无法下载）。
>
> - 请在拿到地址后 **7 天内把文件转存到你自己的存储**（自有对象存储、CDN、服务器磁盘均可），不要把我们的地址当作长期链接使用。
> - 地址过期 **不需要重新生成歌曲、也不会产生额外费用**：重新调用[歌曲查询 API](current-music-query.md)（或[媒体下载 API](current-music-media-download.md)）即可拿到该歌曲**新的有效地址**。

## 等待时间与超时设置

生成类接口是**同步接口**：只有在响应返回时，订单才算被受理并提交给平台生成。在此之前服务端需要先完成账号调度和必要的安全验证，这个过程不会有任何中间响应，也不会有其他接口能查到这一单。因此判断"有没有生成"的唯一依据是响应本身，而不是等待过程中观察到的任何现象。

**实测等待时间**（2026-09-18 ~ 2026-09-20 生产环境 `/api/music/create` 系列）

| 分位 | 等待时间 |
|---|---|
| p50 | 约 1.2–1.6 秒 |
| p75 | 约 2–6 秒 |
| p90 | 约 42–49 秒 |
| p95 | 约 48–76 秒 |
| p99 | 约 109–160 秒 |
| 最长 | 约 230 秒 |

- 约 10% 的请求需要等待 30 秒以上，约 1% 需要 1–2 分钟。等待时间偏长的请求，通常是本次需要先通过一次安全检查。
- 请求字段、返回结构、错误码和计费方式都没有变化，**已有接入方只需要调整客户端超时设置，不需要修改其他代码**。

**接入要求**

1. 客户端超时请设置为 **300 秒以上**。默认 30 秒、60 秒、120 秒的客户端会在等待期间主动断开。
2. **未收到响应不等于没有生成。** 连接超时或中断时，订单可能已经受理并正在生成。
3. 超时后**不要立即重试**：重复提交会产生新订单并再次扣费。
4. 如果连接中断，请稍后用 `GET /api/music/songs` 按时间倒序查询；已受理的订单会正常出现在列表里。确认确实没有，再重新提交。
5. 报障请附上响应头里的 `X-Oneapi-Request-Id`，便于直接定位到这一次请求。

**不想挂长连接？用受理回执模式。** `POST /api/music/create` 与 `POST /api/music/create/custom` 支持可选的受理回执：请求体加 `"accept_mode": "async"`（或请求头 `X-Accept-Mode: async`），接口立刻返回 `202` 和受理号，生成在后台继续，用 `GET /api/music/requests/{request_id}` 查进度。这样客户端即使只有几十秒超时也不会误判"没有生成"、也不会因为重试而重复扣费。详见[灵感模式生成 API](current-music-create.md) 的「受理回执模式」。

> 参考：`python requests` 用 `timeout=300`，`urllib` 用 `urlopen(..., timeout=300)`，Node 用 `req.setTimeout(300000)`，curl 用 `--max-time 300`。

## 推荐接口列表

| 能力 | 方法 | 路径 | 计费提示 | 文档 |
|---|---|---|---|---|
| 账户余额查询 | GET | `/api/user/balance` | 免费 | [查看](current-user-balance.md) |
| 灵感模式生成 | POST | `/api/music/create` | 收费，当前默认 0.6 元/次 | [查看](current-music-create.md) |
| 专业模式生成 | POST | `/api/music/create/custom` | 收费，支持声音性别、风格参考度和随机度 | [查看](current-music-create-custom.md) |
| 演讲（Speech）生成 | POST | `/api/music/speech` | 收费，当前默认 0.6 元/次；可选背景音乐 | [查看](current-music-speech.md) |
| 生成受理进度查询 | GET | `/api/music/requests/{request_id}` | 免费；配合 `accept_mode=async` 使用 | [查看](current-music-create.md) |
| 音效生成 | POST | `/api/music/sounds` | 收费，当前默认 0.6 元/次 | [查看](current-music-sounds.md) |
| 歌词生成 | POST | `/api/lyrics/generate` | 免费额度内免费（每分钟10次、每天300次），超出后 0.1 元/次 | [查看](current-lyrics-generate.md) |
| **克隆音色（推荐）** | POST | `/api/music/voice-profile/create` | 免费（`enhanced=true` 按强化克隆价计费） | [查看](current-clone-voice.md) |
| **音色翻唱（推荐）** | POST | `/api/music/voice-profile/cover` | 1.2 元/次；Max Mode 2.4 元/次 | [查看](current-clone-voice.md) |
| 音色列表 / 详情 / 删除（推荐） | GET/POST | `/api/music/voice-profile/list`、`/{voice_id}`、`/delete` | 免费 | [查看](current-clone-voice.md) |
| 人声克隆（旧链路，不推荐） | POST | `/api/voice/clone/validate` | 免费 | [查看](current-voice-clone.md) |
| 查询人声克隆任务 | GET | `/api/voice/clone/tasks/:voice_task_id` | 免费 | [查看](current-voice-clone.md) |
| 重新生成人声验证文本 | POST | `/api/voice/clone/tasks/:voice_task_id/regenerate` | 免费 | [查看](current-voice-clone.md) |
| 提交验证音频并创建人声 | POST | `/api/voice/clone/tasks/:voice_task_id/generate` | 按人声克隆规则计费 | [查看](current-voice-clone.md) |
| 检查克隆人声可用状态 | POST | `/api/voice/clone/tasks/:voice_task_id/check` | 免费 | [查看](current-voice-clone.md) |
| 删除克隆人声 | DELETE | `/api/voice/clone/voices/:voice_task_id` | 免费 | [查看](current-voice-clone.md) |
| 指定人声生成 | POST | `/api/music/generate-with-voice` | 收费，1.2 元/次；Max Mode 2.4 元/次 | [查看](current-voice-clone.md) |
| 查询指定人声生成结果 | GET | `/api/music/generate-with-voice/results` | 免费 | [查看](current-voice-clone.md) |
| 风格增强 | POST | `/api/music/boost-style` | 免费额度内免费（每分钟10次、每天300次），超出后 0.1 元/次 | [查看](current-music-boost-style.md) |
| 灵感提示词 | POST | `/api/prompts/suggestions` | 免费额度内免费（每分钟10次、每天300次），超出后 0.1 元/次 | [查看](current-prompts-suggestions.md) |
| 上传源音频 | POST | `/api/music/upload-source` | 免费 | [查看](current-music-upload-source.md) |
| 提交强化上传 | POST | `/api/music/enhanced-upload` | 收费，10 元/次 | [查看](current-music-enhanced-upload.md) |
| 查询强化上传任务列表 | GET | `/api/music/enhanced-upload` | 免费 | [查看](current-music-enhanced-upload.md) |
| 查询单个强化上传任务 | GET | `/api/music/enhanced-upload/:id` | 免费 | [查看](current-music-enhanced-upload.md) |
| 取消强化上传任务 | POST | `/api/music/enhanced-upload/:id/cancel` | 免费；仅允许阶段可取消并退款 | [查看](current-music-enhanced-upload.md) |
| 上传后翻唱 | POST | `/api/music/upload-cover` | 收费，当前默认 0.6 元/次；音频较大建议改用 `upload-source` + `generate-from-source` 两步式 | [查看](current-music-upload-cover.md) |
| 基于源 clip 翻唱 | POST | `/api/music/generate-from-source` | 收费，当前默认 0.6 元/次 | [查看](current-music-generate-from-source.md) |
| 续写 | POST | `/api/music/extend` | 收费，当前默认 0.6 元/次 | [查看](current-music-extend.md) |
| 替换段落 | POST | `/api/music/replace-section` | 收费，当前默认 0.6 元/次 | [查看](current-music-replace-section.md) |
| 整首拼接（Get Full Song） | POST | `/api/music/concat` | 收费，固定 0.05 元/次 | [查看](current-music-full-song.md) |
| 母带重制（Remaster） | POST | `/api/music/remaster` | 收费，当前默认 0.6 元/次 | [查看](current-music-remaster.md) |
| 增加伴奏 | POST | `/api/music/add-instrumental` | 收费，按请求模型计费 | [查看](current-music-add-instrumental.md) |
| 增加人声 | POST | `/api/music/add-vocal` | 收费，按请求模型计费 | [查看](current-music-add-vocal.md) |
| 加轨 | POST | `/api/music/add-stem` | 收费，按请求模型计费 | [查看](current-music-add-stem.md) |
| 融合 | POST | `/api/music/mashup` | 收费，按请求模型计费 | [查看](current-music-mashup.md) |
| 采样 | POST | `/api/music/sample` | 收费，按请求模型计费 | [查看](current-music-sample.md) |
| 灵感 | POST | `/api/music/inspo` | 收费，按请求模型计费 | [查看](current-music-inspo.md) |
| 裁剪 | POST | `/api/music/crop` | 收费，按请求模型计费 | [查看](current-music-crop.md) |
| 删减 | POST | `/api/music/remove-section` | 收费，按请求模型计费 | [查看](current-music-remove-section.md) |
| 淡入/淡出 | POST | `/api/music/fade` | 收费，按请求模型计费 | [查看](current-music-fade.md) |
| 倒放 | POST | `/api/music/reverse` | 收费，按请求模型计费 | [查看](current-music-reverse.md) |
| 变速 | POST | `/api/music/speed` | 收费，按请求模型计费 | [查看](current-music-speed.md) |
| 分轨（人声伴奏分离） | POST | `/api/music/separate` | 收费，`two` 默认 0.6 元/次；`twelve` 默认 3.0 元/次 | [查看](current-music-separate.md) |
| 人声去除 | POST | `/api/music/vocal-removal` | 免费 | [查看](current-music-vocal-removal.md) |
| 分轨删除 | POST | `/api/music/stem-delete` | 免费 | [查看](current-music-stem-delete.md) |
| WAV 生成/获取 | POST | `/api/music/wav` | 免费 | [查看](current-music-wav.md) |
| MIDI 获取 | POST | `/api/music/download-file`（`kind=midi`） | 免费 | [查看](current-music-midi.md) |
| 媒体地址 / 试听流 | POST | `/api/music/download-url`、`/api/music/generation-stream-url` | 免费 | [查看](current-music-media-download.md) |
| 歌曲文件下载 | POST | `/api/music/download-file` | 免费 | [查看](current-music-media-download.md) |
| 歌曲资源打包下载 | POST | `/api/music/download-all` | 免费 | [查看](current-music-media-download.md) |
| 稳定下载地址 | GET | `/api/music/download` | 免费 | [查看](current-music-media-download.md) |
| Free2 下载 | POST | `/api/music/free2` | 收费，0.2 元/首（按成功首数） | [查看](current-music-free2.md) |
| 指定歌曲状态查询 | POST | `/api/music/query` | 免费 | [查看](current-music-query.md) |
| 账号歌曲历史 | GET | `/api/music/songs` | 免费 | [查看](current-music-query.md) |
| 歌曲生成参数 | GET | `/api/music/songs/:song_id` | 免费 | [查看](current-music-query.md) |
| 时间轴歌词 | POST | `/api/lyrics/timeline` | 免费 | [查看](current-lyrics-timeline.md) |
| 授权资格与身份 | GET | `/api/music/authorization/context` | 免费 | [查看](current-music-authorization.md) |
| 绑定授权身份 | POST | `/api/music/authorization/identity` | 免费；身份确认后不可修改 | [查看](current-music-authorization.md) |
| 查询可授权歌曲 | GET | `/api/music/authorization/songs` | 免费；需完成授权身份绑定 | [查看](current-music-authorization.md) |
| 生成音乐商用授权书 | POST | `/api/music/authorization/certificates` | 免费；需满足授权资格 | [查看](current-music-authorization.md) |
| 查询授权书历史 | GET | `/api/music/authorization/certificates` | 免费 | [查看](current-music-authorization.md) |
| 查询授权书详情 | GET | `/api/music/authorization/certificates/:id` | 免费 | [查看](current-music-authorization.md) |
| 下载授权书 PDF | GET | `/api/music/authorization/certificates/:id/download` | 免费 | [查看](current-music-authorization.md) |

> 以上 `/api/voice/clone/*` 与 `/api/music/generate-with-voice` 属于**早期人声克隆链路，不推荐新接入**，
> 请改用[【推荐】克隆音色 API](current-clone-voice.md)。

## 高级参数：Max Mode 与 Variety

生成类接口都支持这两个**可选**参数（不传等于保持原来的行为与价格）：

| 参数名 | 类型 | 取值范围 | 说明 |
|---|---|---|---|
| max_mode | boolean | `true` / `false` | 开启后使用更多算力提升整首歌曲的一致性；**本次请求按 2 倍价格计费** |
| variety | integer | `0`-`4` | 风格变化程度：`0`=Off、`1`=Normal、`2`=High、`3`=Extra、`4`=Max；不传表示使用模型默认档（v6 系列默认 `1`），不额外计费 |

支持这两个参数的接口：`POST /api/music/create`、`POST /api/music/create/custom`、
`POST /api/music/extend`、`POST /api/music/upload-cover`、`POST /api/music/generate-from-source`、
`POST /api/music/add-instrumental`、`POST /api/music/add-vocal`、`POST /api/music/add-stem`、
`POST /api/music/mashup`、`POST /api/music/sample`、`POST /api/music/inspo`、
`POST /api/music/replace-section`、`POST /api/music/voice-profile/cover`、`POST /api/music/speech`。

- `max_mode` 的 2 倍价格示例：默认 0.6 元/次的接口开启后为 1.2 元/次；
  [指定人声生成](current-voice-clone.md) 默认 1.2 元/次，开启后为 2.4 元/次；
  [【推荐】克隆音色 API](current-clone-voice.md) 的音色翻唱同样是 1.2 元/次（开启 `max_mode` 为 2.4 元/次）。
- `variety` 只对 `suno-v6` 系列（`suno-v6`、`suno-v6-wild`、`suno-v6-mini`）有效，
  其它模型传了会返回 400。
- 音效生成、分轨、拼接、WAV、Studio 编辑类动作（裁剪、删减、淡入淡出、倒放、变速等）
  没有这两个参数，显式传入会返回 400，避免"传了但没生效"。
- `variety` 是 0-4 的整数原值，与 `style_weight`、`weirdness_constraint`（0-1 小数）量纲不同。

## 通用歌曲返回字段

音乐生成、翻唱、续写、分离、查询等接口通常返回歌曲数组，常用字段如下：

| 字段 | 类型 | 说明 |
|---|---|---|
| `song_id` | string | 歌曲或任务 ID |
| `song_title` | string | 歌曲标题 |
| `status` | string | 状态，如 `pending`、`completed`、`failed` |
| `audio_url` | string | 音频地址，生成完成后返回 |
| `video_url` | string | 视频地址，可能为空 |
| `cover_url` | string | 封面地址 |
| `lyrics` | string | 歌词文本 |
| `style_tags` | string | 风格标签 |
| `duration` | number | 音频时长，单位秒 |
| `created_at` | string | 创建时间 |
| `model_version` | string | 模型版本 |
| `generation_type` | string | 生成类型 |
| `error_message` | string | 失败原因 |

## 接入四步（最小可用示例）

新接入按这四步走一遍就能拿到第一首歌；每一步的完整字段见「推荐接口列表」里对应的文档页。

```bash
# 1) 提交生成：0.6 元一次，返回 2 首
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"description": "明亮的中文流行，钢琴前奏，温暖女声", "model": "suno-v6"}'

# 2) 轮询任务：直到 status 变成 completed（建议 3-5 秒一次）
curl -X POST https://www.suno-api.io/api/music/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "第 1 步返回的 song_id"}'

# 3) 取媒体地址：读取类接口免费，可指定 song / wav / video / cover / midi
curl -X POST https://www.suno-api.io/api/music/download-url \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "同一个 song_id", "kind": "song"}'
```

出问题时的排查入口：**401 / 402 / 403 / 429** 见[报错清单](/blog/suno-api-errors/)；**超时与重复扣费**见下面的「等待时间与超时设置」；**接口逐个说明**见下面的「推荐接口列表」。

## 调用建议

- 新接入客户建议统一使用 `suno-v6`。
- 标注默认价格的接口，实际扣费以当前后台价格配置和请求模型为准。
- 生成类接口通常会先返回任务，再通过 `/api/music/query` 查询最终音频。
- `wait_completion=true` 会阻塞等待，适合低频测试；生产环境更建议异步查询。
- 生成类接口可能需要等待较长时间才返回，**请把客户端超时设为 300 秒以上**，并注意"未收到响应"不等于没有生成，详见上面的「等待时间与超时设置」。
- 上传、翻唱、替换、WAV 等能力依赖平台账号和源 clip 权限，失败时请优先查看返回的 `message` 或 `error_message`。

## 版本说明

本文档按当前 Create UI 已接入能力重新整理，推荐新接入客户优先阅读本章节。旧版接口文档仍保留在“旧版接口文档（兼容）”章节，老用户可以继续按原方式调用。
