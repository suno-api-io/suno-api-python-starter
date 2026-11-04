# 歌曲查询与历史 API

本页包含三类免费查询接口：

| 能力 | 方法 | 接口地址 |
|---|---|---|
| 查询指定歌曲的生成状态和结果 | POST | `/api/music/query` |
| 查询当前账号已经生成的歌曲 | GET | `/api/music/songs` |
| 查询指定歌曲生成时留存的参数 | GET | `/api/music/songs/:song_id` |

> 如果你用的是生成接口的**受理回执模式**（`accept_mode=async`），拿到的是受理号而不是歌曲 ID，
> 进度请用 `GET /api/music/requests/{request_id}` 查询，拿到真实 `song_id` 后再回到本页的接口。
> 详见[灵感模式生成 API](current-music-create.md) 的「受理回执模式」。

## 认证与数据范围

所有接口使用同一套 API Key 认证：

```http
Authorization: Bearer YOUR_API_KEY
```

歌曲历史按 API Key 所属的 `user_id` 隔离。同一主账号创建的多个 API Key 可以查询该主账号的歌曲历史，但不能查询其他用户或子站账号的歌曲。

历史歌曲接口只返回真实生成歌曲，不包含：

- `pending:` 开头的生成占位记录；
- 上传源音频和强化上传记录；
- 人声/伴奏分离、stems 等子结果；
- 其他用户或子站账号的歌曲。

---

## 一、查询歌曲生成状态

用于根据一个或多个歌曲 ID 查询当前生成状态和最终结果。

**接口地址**：`POST /api/music/query`

**计费**：免费。

### Headers

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| model | string | 否 | `suno-v6` | 模型版本 |
| song_ids | string | 是 | - | 歌曲 ID，多个使用英文逗号分隔 |

### 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "song_ids": "clip_id_1,clip_id_2"
  }'
```

### 响应示例

```json
[
  {
    "song_id": "clip_id_1",
    "song_title": "歌曲标题",
    "status": "completed",
    "audio_url": "https://example.com/audio.mp3",
    "video_url": "https://example.com/video.mp4",
    "cover_url": "https://example.com/cover.jpg",
    "lyrics": "歌词内容",
    "style_tags": "Mandopop, acoustic",
    "duration": 180.5,
    "model_version": "suno-v6",
    "created_at": "2026-05-21T10:00:00Z"
  }
]
```

### 兼容说明

旧版文档中 `song_ids` 可能写为数组。新版推荐使用逗号分隔字符串，与当前接口调用方式保持一致。

`song_ids` 必须是真实歌曲 ID。`pending:` 开头的占位 ID 不是最终 `song_id`，不能用于本接口；只查询占位 ID 时可能返回空数组 `[]`。

查询响应中的 `model`、`model_version` 或平台 `model_name` 可能保留历史值。当前新任务应使用 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`；`suno-v2` 至 `suno-v5-5` 已下线，历史记录出现这些名称不代表可以继续提交对应模型。

生成任务处于 `pending`、`submitted` 或 `processing` 时，`audio_url`、`video_url` 和 `cover_url` 可能为空，这是任务尚未完成的正常表现。不要仅根据地址为空判断失败；请结合 `status` 判断，并在状态完成后再次查询。只有状态完成且地址仍为空时，才建议联系技术支持并提供 `song_id`。

> **⚠️ 音频地址有效期：7 天，请及时转存**
>
> 本接口返回的 `audio_url`、`video_url`（以及 WAV 等其它媒体地址）由平台对象存储提供，**默认在 7 天后失效**：到期后文件被回收，再用旧地址访问会返回 404。
>
> - 请在 **7 天内把文件转存到你自己的存储**，不要把它当作长期可用的链接。
> - 地址过期**不需要重新生成歌曲、也不会再次计费**：重新调用本接口（`POST /api/music/query`）即可拿到该歌曲**新的有效地址**。

---

## 二、查询账号歌曲历史

查询当前 API Key 所属主账号已经生成的歌曲，适合构建用户自己的歌曲列表、选择器或历史记录页面。

**接口地址**：`GET /api/music/songs`

**计费**：免费。

### Query 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| p | integer | 否 | `1` | 页码，从 1 开始 |
| page_size | integer | 否 | `20` | 每页数量，最大 100 |
| q | string | 否 | - | 按标题模糊搜索，或按完整歌曲 ID 精确搜索 |
| status | string | 否 | - | 按状态精确过滤，例如 `completed`、`playable` |

结果按 `created_at`、内部记录 ID 倒序排列，保证翻页顺序稳定。

> **提交超时后的找回方式**：生成类接口在受理前不会有中间响应。如果客户端在提交时超时或断开了连接，这一单可能已经受理并生成了歌曲。请用本接口按时间倒序看一眼，已受理的歌曲会正常出现在列表里；确认确实没有，再重新提交，避免重复扣费。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

### 请求示例

```bash
curl "https://www.suno-api.io/api/music/songs?p=1&page_size=20&status=completed" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "page": 1,
    "page_size": 20,
    "total": 42,
    "items": [
      {
        "song_id": "8e31b3c0-example-song-id",
        "title": "夜色中的城市",
        "status": "completed",
        "generation_type": "custom_generate",
        "model": "suno-v6",
        "duration": 187.42,
        "audio_url": "https://example.com/audio.mp3",
        "image_url": "https://example.com/cover.jpg",
        "created_at": 1784000000,
        "completed_at": 1784000120
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| song_id | string | 可用于详情查询的真实歌曲 ID |
| title | string | 当前歌曲标题，可能被用户重命名 |
| status | string | 当前状态 |
| generation_type | string | 生成类型 |
| model | string | 生成模型 |
| duration | number | 音频时长，单位秒 |
| audio_url | string | 音频地址，未完成时可能为空 |
| image_url | string | 封面地址，可能为空 |
| created_at | integer | 创建时间，Unix 秒级时间戳 |
| completed_at | integer | 完成时间，Unix 秒级时间戳；未完成时可能不返回 |

列表接口不会返回提示词、计费字段、账号信息或原始响应。需要提示词和生成参数时，请调用歌曲详情接口。

---

## 三、查询歌曲生成参数

根据歌曲 ID 查询该歌曲生成时由平台留存的提示词、风格、模型和来源歌曲等参数。

**接口地址**：`GET /api/music/songs/:song_id`

**计费**：免费。

只能查询当前 API Key 所属主账号的歌曲。其他用户或子站账号的歌曲统一按“歌曲不存在”处理。

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| song_id | string | 是 | 真实歌曲 ID |

### 请求示例

```bash
curl "https://www.suno-api.io/api/music/songs/8e31b3c0-example-song-id" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "song_id": "8e31b3c0-example-song-id",
    "title": "夜色中的城市",
    "status": "completed",
    "generation_type": "custom_generate",
    "model": "suno-v6",
    "duration": 187.42,
    "audio_url": "https://example.com/audio.mp3",
    "image_url": "https://example.com/cover.jpg",
    "video_url": "",
    "wav_url": "",
    "created_at": 1784000000,
    "completed_at": 1784000120,
    "client_request_id": "example-request-id",
    "client_request_index": 0,
    "parameters": {
      "prompt": "雨后的城市街道，关于重逢的歌词",
      "style_tags": "Mandopop, acoustic, warm vocal",
      "title": "夜色中的城市",
      "model": "suno-v6",
      "generation_type": "custom_generate",
      "source_song_id": "",
      "source_audio_url": "",
      "custom_mode": null,
      "instrumental": null,
      "negative_tags": null,
      "vocal_gender": null,
      "lyrics_mode": null,
      "wait_audio": null,
      "style_weight": null,
      "weirdness_constraint": null
    },
    "parameter_retention": {
      "core_parameters_available": true,
      "extended_parameters_available": false,
      "sources": [
        "suno_tasks"
      ],
      "unavailable_fields": [
        "custom_mode",
        "instrumental",
        "negative_tags",
        "vocal_gender",
        "lyrics_mode",
        "wait_audio",
        "style_weight",
        "weirdness_constraint"
      ]
    }
  }
}
```

### `parameters` 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| prompt | string | 生成提示词或歌词 |
| style_tags | string | 风格标签 |
| title | string | 留存的生成标题；普通历史任务可能只保留当前标题 |
| model | string | 生成模型 |
| generation_type | string | 生成类型 |
| source_song_id | string | 翻唱、续写等任务的来源歌曲 ID |
| source_audio_url | string | 来源音频地址 |
| custom_mode | boolean/null | 是否为自定义模式；未留存时为 `null` |
| instrumental | boolean/null | 是否纯音乐；现有历史数据通常未独立留存 |
| negative_tags | string/null | 排除风格 |
| vocal_gender | string/null | 人声性别设置 |
| lyrics_mode | string/null | 歌词模式；现有历史数据通常未留存 |
| wait_audio | boolean/null | 是否等待完整音频；现有历史数据通常未留存 |
| style_weight | number/null | 风格权重 |
| weirdness_constraint | number/null | 创意/怪异度参数 |

### `prompt_view` 字段（查看提示词，2026-09-28 新增）

`prompt_view` 是"查看提示词"专用的**归一化**结构：按生成类型把数据组织成固定分区，
客户端不用再自己判断哪个字段该展示。它是**纯新增字段**——老字段（`parameters`、
`parameter_retention`）名称与含义不变，不解析新字段的客户端完全不受影响。

```jsonc
"prompt_view": {
  "type": "custom_generate",
  "type_label": "高级模式",
  "generation": {
    "model": "suno-v6", "max_mode": false, "duration": 182.4,
    "title": "凌晨四点#701f37", "title_base": "凌晨四点", "title_suffix": "701f37",
    "created_at": 1790421721
  },
  "inputs": {
    "user_text": "……", "user_text_kind": "lyrics",
    "user_style": "国潮电子, 重低音贝斯, 复古合成器",
    "style_tags": "国潮电子, 重低音贝斯, 复古合成器",
    "style_source": "user", "lyrics": "……",
    "negative_tags": "", "is_instrumental": false
  },
  "extended": {
    "vocal_gender": "m", "style_weight": 0.5, "audio_weight": 0.85,
    "weirdness_constraint": 0.5, "variety": 2, "lyrics_mode": "manual",
    "custom_mode": true
  },
  "reference": { "voice_name": "sv_40_34", "source_song_id": "", "source_title": "" },
  "retention": {
    "recorded_since": "2026-09-28", "missing_reason": "",
    "not_applicable_fields": ["audio_weight"]
  }
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` / `type_label` | string | 生成类型原值 / 中文标签（简易生成、高级模式、音效模式、音色克隆生成…） |
| `generation.model` | string | 使用的模型 |
| `generation.max_mode` | bool | 是否开启 Max Mode |
| `generation.duration` | number | 音频时长（秒） |
| `generation.title` | string | 原样标题（可能包含后缀） |
| `generation.title_base` | string | 去掉尾部 `#xxxxxx` 后缀的展示标题 |
| `generation.title_suffix` | string | 后缀本身（不含 `#`）；没有后缀时为空 |
| `inputs.user_text` | string | 用户输入（描述或歌词，视类型而定） |
| `inputs.user_text_kind` | string | `lyrics` / `description` / `cover_requirements` |
| `inputs.user_style` | string | **用户自己填的**风格（高级模式、音色、音效） |
| `inputs.style_tags` | string | 最终生效的风格 |
| `inputs.style_source` | string | `user` = 用户填的；`suno_derived` = Suno 根据描述归纳出来的 |
| `inputs.lyrics` | string | 歌词正文；没有歌词时为空，纯音乐为 `[Instrumental]` |
| `inputs.negative_tags` | string | 排除风格 |
| `inputs.is_instrumental` | bool | 是否纯音乐 |
| `extended.*` | — | 扩展参数，见下；没有留存的字段不会出现 |
| `reference.voice_name` | string | 音色名（音色类才有；**不返回**内部 persona id） |
| `reference.source_song_id` / `source_title` | string | 翻唱、续写等任务的来源歌曲 |
| `retention.recorded_since` | string | 扩展参数开始留存的日期（`2026-09-28`） |
| `retention.missing_reason` | string | 为什么没有扩展参数；历史数据为 `not_recorded_before_20260928` |
| `retention.not_applicable_fields` | string[] | 该生成类型本来就不需要的参数（**不要**显示成"参数缺失"） |

`extended` 可能出现的字段：`vocal_gender`、`style_weight`、`audio_weight`、
`weirdness_constraint`、`variety`、`lyrics_mode`、`custom_mode`，以及音效类的
`sound_type` / `sound_bpm` / `sound_key` / `sound_loop`。空值一律不返回。

三条展示规则（客户端按这个做，不要自己推断）：

1. **风格来源要区分**：`style_source=suno_derived` 时请展示成
   "风格（Suno 根据你的描述归纳）"，不要写成"你填的风格"；
2. **内部提示词不会出现**：音色翻唱类只返回用户自己填的【风格要求】/【翻唱要求】，
   我们拼给模型的固定结构段不会出现在任何字段里（历史数据同样已脱敏）；
3. **没留存的参数不猜**：`extended` 里没有就是当时没记录，用 `retention` 向用户解释原因。

### 参数留存说明

`parameter_retention` 用于区分“明确传入了空值”和“历史上没有保存该字段”：

- `core_parameters_available`：主歌曲任务记录是否存在，正常详情固定为 `true`；
- `extended_parameters_available`：是否找到了关联的扩展音乐任务记录；
- `sources`：本次参数来自哪些数据表；
- `unavailable_fields`：无法从历史数据可靠恢复的字段，这些字段在 `parameters` 中返回 `null`。

普通历史歌曲通常保存了提示词、风格、当前标题、模型、生成类型和来源歌曲，但没有独立保存全部高级参数。平台不会根据 `generation_type` 猜测缺失值。

部分扩展音乐任务还保存了原始提示词、风格、标题、模型，以及 `custom_mode`、`negative_tags`、`vocal_gender`、`style_weight`、`weirdness_constraint`。即使存在扩展记录，`instrumental`、`lyrics_mode` 和 `wait_audio` 仍可能无法恢复。

歌曲标题可以被用户后续重命名。普通历史任务没有单独保存原始标题时，`parameters.title` 可能是当前标题；存在扩展任务记录时，会优先返回扩展记录保存的原始生成标题。

### 不存在或无权限

业务错误使用统一响应信封。歌曲不存在或不属于当前账号时返回：

```json
{
  "success": false,
  "message": "song not found"
}
```

该业务错误当前使用 HTTP 200 返回，请以 `success` 字段判断结果。API Key 缺失、无效、过期或被禁用时返回 HTTP 401。

## 安全说明

歌曲历史和详情接口不会返回：

- API Key、Token ID；
- 额度、计费或退款字段；
- 账号信息和原始响应；
- 对象存储内部键；
- 管理员错误和内部资源错误。
