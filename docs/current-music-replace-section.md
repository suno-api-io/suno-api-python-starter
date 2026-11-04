# 替换段落 API

## 接口说明

替换段落用于对已有歌曲的指定时间段进行局部重生成，适合修正一句歌词或替换某个片段。

**接口地址**: `POST /api/music/replace-section`

**计费**: 收费，当前默认 0.6 元/次。实际扣费以当前后台价格配置为准。

**Max Mode / Variety**：本接口支持可选参数 `max_mode` 与 `variety`（0-4）。开启 `max_mode`
时本次按 2 倍价格计费（0.6 → 1.2 元/次），`variety` 不额外计费；两者含义与写法见
[新版 API 总览](current-overview.md) 的「高级参数」一节。

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
| model | string | 否 | suno-v6 | 对客模型名：`suno-v6`、`suno-v6-wild` 或 `suno-v6-mini` |
| audioId | string | 是 | - | 原歌曲 ID |
| startSeconds | number | 是 | - | 替换开始秒数，可填小数。**片段长度必须 ≥ 2 秒** |
| endSeconds | number | 是 | - | 替换结束秒数，可填小数；必须大于 `startSeconds`，且区间要在原歌时长内 |
| contextLyrics | string | 是 | - | **整首歌的完整歌词**，作为生成上下文（兼容写法 `prompt`）。不传会 400 |
| contextWindowLyrics | string | 否 | 同 `contextLyrics` | **要替换的那段附近的歌词**（前后一两句即可），用于衔接；不传则用 `contextLyrics` |
| infillLyrics | string | 否 | 同 `contextLyrics` | **替换后的新歌词**；不传则用 `contextLyrics`（等于照原词重唱这一段） |
| style | string | 否 | - | 风格标签 |
| title | string | 否 | - | 标题 |
| negativeTags | string | 否 | - | 负向风格 |
| requestedAt | number | 否 | - | 请求时间戳 |

`startSeconds`、`endSeconds` 的单位是秒，可以填写小数；`startSeconds` 必须小于 `endSeconds`，并且区间应位于原歌曲时长内。`requestedAt` 仅在需要传递请求时间时使用，单位为 Unix 秒级时间戳，不是毫秒时间戳；通常可以省略。

替换接口也是异步任务。返回的 clip 初始状态可能为 `pending`，此时音频地址为空属于正常现象，请使用返回的真实 `song_id` 查询最终结果。

### 片段长度：至少 2 秒（重要）

要替换的区间**不能短于 2 秒**。实测：1.0 / 1.2 / 1.5 秒的区间全部失败，2.0 秒及以上正常。

区间过短时，平台回的不是"参数错误"，而是一句**容易被误读**的提示：

```json
{"error":{"message":"You don't have access to this model. Upgrade your plan to use it.",
          "type":"bad_response_status_code","code":"bad_response_status_code"}}
```

**这句话不是账号或套餐问题**，而是片段太短。把区间拉长到 2 秒以上再提交即可。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/replace-section \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "audioId": "clip_id",
    "startSeconds": 30,
    "endSeconds": 45,
    "contextLyrics": "完整上下文歌词",
    "contextWindowLyrics": "窗口上下文歌词",
    "infillLyrics": "替换后的歌词",
    "style": "Mandopop, acoustic",
    "title": "替换版本",
    "negativeTags": "noise"
  }'
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "clips": [
      {
        "song_id": "replace_clip_id",
        "song_title": "替换版本",
        "status": "pending"
      }
    ],
    "replaceTask": "infill",
    "clipId": "clip_id",
    "source_update": {}
  }
}
```

## 兼容字段

- `audioId` / `audio_id` / `clipId` / `clip_id`
- `startSeconds` / `start_seconds` / `infillStartS` / `infill_start_s`
- `endSeconds` / `end_seconds` / `infillEndS` / `infill_end_s`
- `infillLyrics` / `infill_lyrics` / `replacementLyrics` / `replacement_lyrics`
- `style` / `tags`
- `negativeTags` / `negative_tags`
