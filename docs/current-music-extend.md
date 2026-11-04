# 续写 API

## 接口说明

续写用于从已有歌曲的指定时间点继续生成后续片段。

**接口地址**: `POST /api/music/extend`

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
| audioId | string | 是 | - | 要续写的歌曲 ID |
| prompt | string | 是 | - | 续写描述 |
| continueAt | number | 是 | - | 续写起点，单位秒。必须 **大于 0 且小于源歌曲时长**；**建议起点之后至少留 10 秒**，否则成品只有那几秒 |
| style | string | 否 | - | 风格标签 |
| negativeTags | string | 否 | - | 负向风格 |
| title | string | 否 | - | 标题 |
| sourceAudioUrl | string | 否 | - | 源音频 URL |
| sourceFileName | string | 否 | - | 源文件名 |
| waitAudio | boolean | 否 | false | 是否等待音频完成 |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/extend \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "audioId": "clip_id",
    "prompt": "继续副歌，情绪更强",
    "continueAt": 60,
    "style": "Mandopop, rock",
    "negativeTags": "noise",
    "title": "续写版本",
    "waitAudio": false
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
        "song_id": "extended_clip_id",
        "song_title": "续写版本",
        "status": "pending"
      }
    ]
  }
}
```

## 兼容字段

旧字段仍兼容：

| 新字段 | 兼容旧字段 |
|---|---|
| audioId | song_id、audio_id |
| prompt | description |
| continueAt | start_time、continue_at |
| style | style_tags、tags |
| negativeTags | negative_tags |
| waitAudio | wait_audio |

## 注意事项

- **起点别贴着结尾**：续写出来的长度基本等于「起点之后剩下的部分」。起点离结尾太近时，成品就只有几秒——实测 242 秒的歌从第 240 秒续写，只出了 2.7 秒（照样按次收费）。**建议起点之后至少留 10 秒。**
- **续写没有「源太短」的门槛**：实测 9.6 秒的短素材、从第 5 秒起续写也能正常出歌，不会因为源短或剩余短而被拒。
- **起点必须大于 0**：`continueAt=0` 会被平台受理后作废，而且不返回失败原因，请直接从第 1 秒之后开始。
- 一次返回 **2 条**结果（按 2 首计费）；请以 `clips` 数组长度为准。
- 结果是**新的作品**，原曲不受影响。
