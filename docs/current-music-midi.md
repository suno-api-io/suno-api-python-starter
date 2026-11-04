# MIDI 获取 API

## 接口说明

MIDI 接口用于把已完成分轨的轨道转成标准 MIDI 文件，供编曲、二次创作或 DAW 导入使用。

Suno 不提供 MIDI 文件的下载地址，只提供每一轨的音符数据（音高、起止时间、力度）。本接口会把这些音符数据转换成标准 MIDI 文件（SMF format 1）后直接返回，因此返回的一定是可被 DAW 打开的真实 `.mid` 文件。

**接口地址**: `POST /api/music/download-file`

> 本页是 MIDI 的专用示例。下载家族（媒体地址、单文件、打包、生成中试听）的完整说明见
> [歌曲媒体下载与试听 API](current-music-media-download.md)。

**计费**: 免费。该接口用于读取已有分轨的音符数据，不扣除额度。

## 请求参数

### Headers

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | Bearer YOUR_API_KEY |
| Content-Type | string | 是 | application/json |

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| song_id | string | 是 | - | 分轨后单条轨道的歌曲 ID（`/api/music/separate` 返回的每个 clip id） |
| kind | string | 是 | - | 固定为 `midi` |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/download-file \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "stem_clip_id",
    "kind": "midi"
  }' \
  --output track.mid
```

## 响应结果

响应体是 MIDI 文件的二进制内容，不是 JSON。

| 响应头 | 值 |
|---|---|
| Content-Type | `audio/midi` |
| Content-Disposition | `attachment; filename="<歌曲标题>.mid"` |

## 获取下载地址

如果需要先拿到地址再下载（例如批量打包），可以先调用：

```bash
curl -X POST https://www.suno-api.io/api/music/download-url \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"song_id":"stem_clip_id","kind":"midi"}'
```

```json
{
  "success": true,
  "message": "",
  "data": {
    "song_id": "stem_clip_id",
    "kind": "midi",
    "url": "https://www.suno-api.io/api/music/download?song_id=stem_clip_id&kind=midi"
  }
}
```

该地址同样需要携带 `Authorization` 请求头才能访问；不带 API Key 会返回 401。

## MIDI 文件说明

| 项目 | 取值 | 说明 |
|---|---|---|
| 文件格式 | SMF format 1 | 1 条 Tempo 轨 + 每条乐器 1 条轨 |
| 时间精度 | 480 PPQ | 每拍 480 tick |
| 速度 | 120 BPM | Suno 只给秒数、不给 BPM，因此使用固定速度写入时间轴 |
| 时间轴 | `1 秒 = 960 tick` | 与平台返回的秒数一一对应，导入 DAW 后可按需改速度 |
| 力度 | 0–127 | 平台给的是 0–1 浮点，接口已按 ×127 换算 |
| 鼓组 | MIDI 通道 10 | 平台标记为鼓的轨道会自动放到打击乐通道 |

## 注意事项

- **只对已完成分轨的轨道有效**：`song_id` 必须是 `/api/music/separate` 返回的轨道 ID，不能传原始歌曲 ID。
- **没有音符的分轨是正常结果**：某些轨道（例如 FX）没有可转谱的音符，此时会返回一个不含音符的合法 MIDI 文件，而不是报错。
- **MIDI 只包含音符信息**：音量、声像、效果器等混音参数不在 MIDI 中，需要在 DAW 里自行设置音色。
- **每条轨道单独请求**：一次请求返回一条轨道的 `.mid`；多轨请对每个轨道分别调用，或使用 Create UI 的批量打包下载。
