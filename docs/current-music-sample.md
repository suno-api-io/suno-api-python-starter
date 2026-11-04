# 采样 API

## 接口说明

采样用于从已有歌曲中截取一段素材并生成新的歌曲。当前对客开放的是 `chop` 采样模式。

**接口地址**：`POST /api/music/sample`

**计费**：收费，按请求模型计费，实际扣费以后台价格配置为准。

**Max Mode / Variety**：本接口支持可选参数 `max_mode` 与 `variety`（0-4）。开启 `max_mode`
时本次按 2 倍价格计费，`variety` 不额外计费；两者含义与写法见
[新版 API 总览](current-overview.md) 的「高级参数」一节。

**推荐模型**：`suno-v6`。可用 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。实测多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。**请把客户端超时设置为 300 秒以上；未收到响应不等于没有生成，超时后请勿立即重试（会重复下单、重复扣费）。** 连接中断可稍后用 `GET /api/music/songs` 确认。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

## 认证

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

## 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| model | string | 是 | - | 对客模型名：`suno-v6`、`suno-v6-wild` 或 `suno-v6-mini` |
| source_clip_id | string | 是 | - | 来源歌曲的真实 `song_id`，必须已完成且当前 API Key 可访问 |
| mode | string | 是 | - | 当前只支持 `chop` |
| start_seconds | number | 是 | - | 采样开始秒数，必须大于等于 0 |
| end_seconds | number | 是 | - | 采样结束秒数，必须大于 `start_seconds` |
| lyrics | string | 否 | - | 歌词或创作方向 |
| style_tags | string | 否 | - | 风格标签 |
| song_title | string | 否 | - | 结果标题 |
| wait_completion | boolean | 否 | false | 是否等待较长时间再返回 |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/sample \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "source_clip_id": "source_song_id",
    "mode": "chop",
    "start_seconds": 0,
    "end_seconds": 30,
    "style_tags": "funky pop, chopped sample",
    "song_title": "采样版本",
    "wait_completion": false
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
        "song_id": "result_song_id",
        "song_title": "采样版本",
        "status": "pending"
      },
      {
        "song_id": "result_song_id_2",
        "song_title": "采样版本",
        "status": "pending"
      }
    ]
  }
}
```

一次返回 **2 条**结果（按 2 首计费）；示例已按 2 条展示。请以 `clips` 数组长度为准，不要按固定条数写死循环。保存 `clips[].song_id` 后，用[歌曲查询 API](current-music-query.md)轮询到 `completed`。

## 注意事项

- 当前只开放 `chop` 模式。
- `as-is`、`as_is`、`asis` 或 `blend` 当前会返回 HTTP 400，不会提交生成任务。
- `start_seconds` 必须大于等于 0，且必须小于 `end_seconds`。
