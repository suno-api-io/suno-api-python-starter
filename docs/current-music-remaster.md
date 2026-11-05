# 母带重制 API（Remaster）

## 接口说明

母带重制用于把一首已完成的歌曲重新生成一版音质更好的「重制版本」，一次返回 2 个版本，系统会自动为标题追加 `(Remastered)`。

**接口地址**：`POST /api/music/remaster`

**计费**：收费，按请求模型计费（默认 `suno-v6`，0.6 元/次），实际扣费以后台价格配置为准。

**模型说明**：重制使用平台固定维护的模型，不随 `model` 变化；请求里的 `model` 只用于计价与渠道选择，建议显式传入 `suno-v6`。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交重制**。请把客户端超时设置为 300 秒以上；未收到响应不等于没有重制，超时后请勿立即重试（会重复下单、重复扣费）。连接中断可稍后用 `GET /api/music/songs` 确认。

## 认证

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

## 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| song_id | string | 是 | - | 要重制的来源歌曲 ID，必须已完成且当前 API Key 可访问 |
| model | string | 否 | suno-v6 | 对客模型名：`suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`，仅用于计价与渠道 |
| variation_category | string | 否 | normal | 变体强度：`subtle`、`normal`、`high`（旧值 `low` 等价于 `subtle`） |
| style_profile | string | 否 | boost | 音色风格：`natural`、`boost`、`clarity` |
| tags | string | 否 | - | 预留字段，非空时由平台处理 |
| source_audio_url | string | 否 | - | 来源歌曲来自外部账号时，来源音频地址 |
| source_file_name | string | 否 | - | 来源歌曲来自外部账号时，来源文件名 |
| source_title | string | 否 | - | 来源歌曲来自外部账号时，来源标题 |

`audio_id`、`source_clip_id`、`sourceClipId` 是 `song_id` 的等价写法，任选一个即可。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/remaster \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "song_id": "source_song_id",
    "variation_category": "high",
    "style_profile": "clarity"
  }'
```

只要默认档位时，只传来源歌曲即可，等价于 `variation_category: normal` + `style_profile: boost`：

```json
{ "model": "suno-v6", "song_id": "source_song_id" }
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "clips": [
      {
        "song_id": "remastered_clip_id_1",
        "song_title": "来源歌名 (Remastered)",
        "status": "processing"
      },
      {
        "song_id": "remastered_clip_id_2",
        "song_title": "来源歌名 (Remastered)",
        "status": "processing"
      }
    ]
  }
}
```

一次返回 **2 个**重制版本。请保存两条 `clips[].song_id`，再用[歌曲查询 API](current-music-query.md)轮询到 `complete` 后取音频。

## 注意事项

- 来源歌曲必须已完成，并且属于当前 API Key 可访问的范围；外部来源素材会自动同步到执行账号。
- 重制只做音质重制：想换风格、换编曲或换演唱，请用[风格增强](current-music-boost-style.md)、[上传后翻唱](current-music-upload-cover.md)或 [Remix 类接口](current-music-mashup.md)。
- `variation_category` 越大，重制版本与来源歌的差异越明显；正式交付前建议用 `normal` 试一版再调高。
