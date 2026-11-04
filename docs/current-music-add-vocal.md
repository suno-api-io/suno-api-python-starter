# 增加人声 API

## 接口说明

增加人声用于在已有歌曲或器乐来源上生成、重写或补全人声。

**接口地址**：`POST /api/music/add-vocal`

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
| lyrics | string | 否 | - | 新增或替换的人声歌词 |
| style_tags | string | 否 | - | 人声风格、演唱方式或和声要求 |
| song_title | string | 否 | - | 结果标题 |
| negative_tags | string | 否 | - | 负向风格标签 |
| instrumental | boolean | 否 | false | 是否纯音乐；增加人声场景通常保持 `false` |
| wait_completion | boolean | 否 | false | 是否等待较长时间再返回 |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/add-vocal \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "source_clip_id": "source_song_id",
    "lyrics": "[Verse]\n夜色落在窗前\n[Chorus]\n我们向光而行",
    "style_tags": "warm male vocal, mandopop, intimate",
    "song_title": "人声增强版本",
    "instrumental": false,
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
        "song_title": "人声增强版本",
        "status": "pending"
      },
      {
        "song_id": "result_song_id_2",
        "song_title": "人声增强版本",
        "status": "pending"
      }
    ]
  }
}
```

一次返回 **2 条**结果（按 2 首计费）；示例已按 2 条展示。请以 `clips` 数组长度为准，不要按固定条数写死循环。保存 `clips[].song_id` 后，用[歌曲查询 API](current-music-query.md)轮询到 `completed`。

## 注意事项

- 增加人声是“在来源歌曲上生成或重写人声”，不等同于 `vocal_gender` 性别偏好。
- 需要指定克隆人声时，请使用[【推荐】克隆音色 API](current-clone-voice.md)；[人声克隆与指定人声生成 API](current-voice-clone.md)（旧链路）不推荐新接入。
