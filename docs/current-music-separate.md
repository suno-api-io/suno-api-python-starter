# 分轨（人声伴奏分离）API

## 接口说明

分轨用于把已有歌曲拆分为人声、伴奏或多轨结果。推荐按以下流程接入：

1. 如果源音频不是本平台生成的歌曲，可先调用 [上传源音频 API](current-music-upload-source.md)。
2. 调用 `POST /api/music/separate` 提交分轨任务。
3. 使用 [歌曲查询 API](current-music-query.md) 轮询分轨结果。
4. 使用下载接口下载每条分轨结果的音频文件。

**接口地址**: `POST /api/music/separate`

**计费**: 收费。`stem_mode=two` 当前默认 0.6 元/次；`stem_mode=twelve` 为多轨拆分，当前默认 3.0 元/次。实际扣费以后台价格配置为准。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。实测多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。**请把客户端超时设置为 300 秒以上；未收到响应不等于没有生成，超时后请勿立即重试（会重复下单、重复扣费）。** 连接中断可稍后用 `GET /api/music/songs` 确认。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

## 认证

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

## 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| song_id | string | 是 | - | 要分轨的源歌曲 ID |
| stem_mode | string | 是 | - | 分轨模式：`two` 或 `twelve` |
| source_audio_url | string | 否 | - | 源音频 URL |
| source_file_name | string | 否 | - | 源音频文件名 |
| source_title | string | 否 | - | 源歌曲标题 |

### stem_mode 说明

| 值 | 返回条数 | 说明 |
|---|---|---|
| `two` | **4 条** | 两轨分离：人声 + 伴奏。一次提交会出 **2 个版本 × 2 轨** |
| `twelve` | **24 条** | 多轨拆分：**2 个版本 × 12 轨**，轨道名见下表 |

### 分轨说明

分轨是独立的固定能力，不需要填写或选择歌曲生成模型。客户只需提交源歌曲和 `stem_mode`；服务端会按分轨模式处理。

**条数怎么来的**：一次提交会产出 **2 个版本**（同一批素材的两种结果），所以条数 = 2 × 该模式的轨道数：`two` 是 4 条，`twelve` 是 24 条。
请以响应里 `clips` 数组的实际长度为准，不要按固定条数写死循环（个别轨道可能失败，成功的轨道照常返回）。

### 各模式返回哪些轨道

`twelve` 模式的 12 条轨道（名称由平台固定给出，顺序可能变化）：

| # | 轨道标题 | 说明 |
|---|---|---|
| 1 | `(Vocals)` | 主唱人声 |
| 2 | `(Backing Vocals)` | 和声 / 背景人声 |
| 3 | `(Drums)` | 鼓组 |
| 4 | `(Bass)` | 贝斯 |
| 5 | `(Guitar)` | 吉他 |
| 6 | `(Keyboard)` | 键盘 / 钢琴类 |
| 7 | `(Percussion)` | 打击乐 |
| 8 | `(Strings)` | 弦乐 |
| 9 | `(Synth)` | 合成器 |
| 10 | `(FX)` | 音效 / 环境声 |
| 11 | `(Brass)` | 铜管 |
| 12 | `(Woodwinds)` | 木管 |

`two` 模式返回 `(Vocals)` 与 `(Instrumental)` 两条轨道，各 2 个版本。
`two` / `twelve` 的轨道标题都是**固定名**（不带来源歌曲名），别指望从标题里看出是哪首歌。

> **轨道标题不能当唯一键。** 两个版本里会出现**同名轨道**（例如两条 `(Vocals)`、两条 `(Strings)`），
> 而且一次分轨会返回多条轨道。请一律用 `song_id` 作为标识，`song_title` 只用于展示；
> 也不要用数组下标（顺序可能变化）。

## 请求示例

### 人声 / 伴奏分离（`stem_mode: "two"`）

```bash
curl -X POST https://www.suno-api.io/api/music/separate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "source_clip_id",
    "stem_mode": "two",
    "source_audio_url": "https://example.com/source.mp3",
    "source_file_name": "source.mp3",
    "source_title": "Source Song"
  }'
```

### 多轨拆分（`stem_mode: "twelve"`）

```bash
curl -X POST https://www.suno-api.io/api/music/separate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "source_clip_id",
    "stem_mode": "twelve",
    "source_audio_url": "https://example.com/source.mp3"
  }'
```

## 响应结果

成功后通常会返回分轨结果数组。每个分轨结果都是一个独立歌曲 clip，需要继续查询直到 `status` 变为完成状态。

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "clips": [
      {
        "song_id": "stem_clip_id_1",
        "song_title": "(Vocals)",
        "status": "pending",
        "generation_type": "separate",
        "created_at": "2026-06-06T10:00:00Z"
      },
      {
        "song_id": "stem_clip_id_2",
        "song_title": "(Instrumental)",
        "status": "pending",
        "generation_type": "separate",
        "created_at": "2026-06-06T10:00:00Z"
      }
    ]
  }
}
```

> 上面只展示了 `two` 模式**其中 2 条**，实际会返回 4 条（2 个版本 × {`(Vocals)`、`(Instrumental)`}）；
> `twelve` 模式会返回 24 条。真实条数以 `clips` 数组长度为准。

客户一般只需要保存 `clips[].song_id`，后续查询和下载都围绕这些 ID 进行。

## 注意事项

- **分轨结果不会出现在 `GET /api/music/songs` 歌曲历史里**（该列表只返回普通生成歌曲）。提交成功后请立刻保存 `clips[].song_id`，否则后续无从查找。
- **轨道是独立作品**：每条轨道都有自己的 `song_id`，需要各自轮询到完成、各自下载。
- **计费与条数无关**：按次计费（`two` 0.6 元/次、`twelve` 3.0 元/次），返回 4 条还是 24 条都是同一价格。
- **下载**：用该轨道的 `song_id` 走 `POST /api/music/download-url` / `download-file`（免费），或直接用查询结果里的 `audio_url`；取 MIDI 见[MIDI 获取 API](current-music-midi.md)。
- **不要重复提交**：分轨是同步接口，超时后请先用歌曲查询确认，不要直接重试（会重复下单、重复扣费）。
- 不再需要的轨道用[分轨删除 API](current-music-stem-delete.md) 隐藏。

## 查询分轨结果

提交成功后，使用 `clips[].song_id` 调用 `POST /api/music/query` 查询结果。

```bash
curl -X POST https://www.suno-api.io/api/music/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_ids": "stem_clip_id_1,stem_clip_id_2"
  }'
```

查询完成示例：

```json
[
  {
    "song_id": "stem_clip_id_1",
    "song_title": "(Vocals)",
    "status": "complete",
    "audio_url": "https://...",
    "cover_url": "https://...",
    "duration": 180.5,
    "generation_type": "separate",
    "stem_from_id": "source_clip_id"
  }
]
```

## 下载分轨文件

分轨结果完成后，可用下载接口下载单个分轨文件。

**接口地址**: `POST /api/music/download-file`

```bash
curl -X POST https://www.suno-api.io/api/music/download-file \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "stem_clip_id_1",
    "kind": "audio"
  }' \
  --output stem.mp3
```

`kind` 支持：

| kind | 说明 |
|---|---|
| `audio` / `song` / `music` | 下载 MP3 音频 |
| `cover` / `image` | 下载封面 |
| `wav` | 下载 WAV 音频 |
| `video` / `mp4` | 下载视频 |

如需打包下载某条分轨结果的相关资源，可调用：

```bash
curl -X POST https://www.suno-api.io/api/music/download-all \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "stem_clip_id_1"
  }' \
  --output stem-resources.zip
```

## 状态说明

| 状态 | 说明 |
|---|---|
| `pending` | 已提交，等待处理 |
| `queued` | 排队中 |
| `generating` / `processing` | 处理中 |
| `complete` / `completed` | 已完成 |
| `error` / `failed` | 失败，请查看 `error_message` |

## 常见错误

| HTTP 状态 | 说明 | 处理建议 |
|---|---|---|
| 400 | 参数错误，例如缺少 `song_id` 或 `stem_mode` | 检查请求参数 |
| 401 | API Key 无效或未传 | 检查 `Authorization` |
| 402 | 余额不足 | 充值后重试 |
| 409 | 源歌曲暂时无法处理 | 检查 `song_id` 或稍后重试 |
| 500/503 | 服务或平台临时异常 | 稍后重试或联系技术支持 |

## 兼容说明

旧版文档中曾使用 `success/task_id/vocals_url/instrumental_url` 这类单对象示例。当前新版分轨以 `clips[]` 歌曲数组为准，每条分轨结果都拥有独立 `song_id`，后续查询和下载都围绕这些 `song_id` 进行。

## 相关接口

- 只想把人声和伴奏分开、不需要选择模式时，可用[人声去除 API](current-music-vocal-removal.md)，
  它是本接口的两轨快捷形式且当前免费。
- 不再需要的分轨轨道用[分轨删除 API](current-music-stem-delete.md) 隐藏（软删除，不扣费）。
- 取分轨的 MIDI 见[MIDI 获取 API](current-music-midi.md)，取音频/封面等媒体见
  [歌曲媒体下载与试听 API](current-music-media-download.md)。
