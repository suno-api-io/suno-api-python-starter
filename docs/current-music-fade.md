# 淡入 / 淡出 API

## 接口说明

淡入/淡出用于为已有歌曲增加渐强或渐弱效果。

**接口地址**：`POST /api/music/fade`

**计费**：收费，按请求模型计费，实际扣费以后台价格配置为准。

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
| direction | string | 是 | - | `in` 表示淡入，`out` 表示淡出 |
| duration_seconds | number | 是 | - | 淡入或淡出时长，单位秒，必须大于 0 |
| song_title | string | 否 | - | 结果标题 |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/fade \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "source_clip_id": "source_song_id",
    "direction": "out",
    "duration_seconds": 3,
    "song_title": "淡出版本"
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
        "song_title": "淡出版本",
        "status": "processing"
      }
    ]
  }
}
```

一次返回 **1 条**结果（编辑类动作不是一次出 2 首）。请保存 `clips[].song_id`，再使用[歌曲查询 API](current-music-query.md)轮询到 `completed`。

## 注意事项

- `direction` 只能填写 `in` 或 `out`，一次请求只能指定一个方向。
- `duration_seconds` 必须大于 0，单位是秒。
