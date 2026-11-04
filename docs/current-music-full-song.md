# 整首拼接 API（Get Full Song）

## 接口说明

整首拼接用于把「原歌 + 新生成的片段」拼成一首完整歌曲：续写（Extend）之后接上后续段落，替换段落（Replace Section）之后把新片段缝回原曲。官方网页端把这条能力叫 **Get Full Song**。

**接口地址**：`POST /api/music/concat`

**计费**：收费，固定 0.05 元/次。拼接与生成价解耦，不参与 Max Mode 与音色倍率，实际扣费以后台价格配置为准。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交拼接**。请把客户端超时设置为 300 秒以上；未收到响应不等于没有拼接，超时后请勿立即重试（会重复下单、重复扣费）。连接中断可稍后用 `GET /api/music/songs` 确认。

## 认证

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

## 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| song_id | string | 是 | - | 要拼接的那条片段 `song_id`（续写产物或替换段落产物），必须已完成 |
| is_infill | boolean | 否 | false | `false` = 续写拼接；`true` = 替换（infill）拼接 |
| source_audio_url | string | 否 | - | 片段来自外部账号时，来源音频地址 |
| source_file_name | string | 否 | - | 片段来自外部账号时，来源文件名 |
| source_title | string | 否 | - | 片段来自外部账号时，来源标题 |

`audio_id`、`source_clip_id`、`sourceClipId` 是 `song_id` 的等价写法，任选一个即可。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/concat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "extended_or_replaced_clip_id",
    "is_infill": false
  }'
```

替换段落之后拼接，把 `is_infill` 改成 `true`：

```json
{ "song_id": "infilled_clip_id", "is_infill": true }
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "clips": [
      {
        "song_id": "concat_clip_id",
        "song_title": "来源歌名",
        "status": "queued"
      }
    ]
  }
}
```

拼接只返回 **1 条**结果（不是一次出 2 首）。请保存 `clips[].song_id`，再用[歌曲查询 API](current-music-query.md)轮询到 `complete` 后取音频。

## 结果时长怎么来的

拼接不是把两个文件直接首尾相接，而是按片段历史里的时间点裁剪来源歌：

| 模式 | 结果构成 |
|---|---|
| `is_infill: false` | 来源歌 `[0 .. continue_at]` + 续写片段全长 |
| `is_infill: true` | 来源歌 `[0 .. 起点]` + 替换后的新片段 + 来源歌 `[终点 .. 结尾]` |

因此「续写点之后」的原音频会被丢弃，不会出现整段重复。

## 注意事项

- 只能拼接**已完成**的片段；生成中的片段请先等它完成。
- 结果是新的一条记录，原片段仍然保留，可继续使用。
- 想把两首不同的歌合成一首请用[融合 API](current-music-mashup.md)；只保留某一段请用[裁剪 API](current-music-crop.md)。
