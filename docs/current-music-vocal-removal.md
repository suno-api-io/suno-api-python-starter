# 人声去除 API

## 接口说明

人声去除用于把一首已有歌曲拆成人声与伴奏两条轨道，是「分轨（人声伴奏分离）」的快捷形式：
调用方只需要给一个来源歌曲 ID，不需要选择分离模式，服务端固定按两轨（`two`）处理。

**接口地址**：`POST /api/music/vocal-removal`

**计费**：免费。该接口只做轨道拆分，不产生生成费用，也不写扣费流水。

**推荐模型**：`suno-v6`。可用 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`。

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
| source_audio_url | string | 否 | - | 来源音频地址（来源跨账号时由服务端做中转，客户端不需要传） |
| source_file_name | string | 否 | - | 来源文件名，仅用于日志与展示 |
| song_title | string | 否 | - | 结果标题前缀，默认沿用来源歌曲标题 |

兼容别名：`sourceClipId`、`audio_id`、`audioId`、`song_id` 都可以代替
`source_clip_id`。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/vocal-removal \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "source_clip_id": "source_song_id",
    "song_title": "人声去除"
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
        "song_id": "vocals_clip_id",
        "song_title": "人声去除 (Vocals)",
        "status": "pending",
        "stem_from_id": "source_song_id",
        "stem_mode": "two"
      },
      {
        "song_id": "instrumental_clip_id",
        "song_title": "人声去除 (Instrumental)",
        "status": "pending",
        "stem_from_id": "source_song_id",
        "stem_mode": "two"
      }
    ]
  }
}
```

平台一次提交会返回 **2 个版本 × {Vocals, Instrumental}**，因此 `clips` 通常有 4 条。
请按 `stem_from_id` 分组、按 `song_title` 后缀区分人声与伴奏。

## 注意事项

- 结果轨道请用[歌曲查询 API](current-music-query.md)（`POST /api/music/query`）轮询到
  `completed` 后再使用；`GET /api/music/songs/:song_id` 与歌曲历史列表**当前不包含**
  人声去除产出的轨道，这是已知差异。
- 需要选择两轨/多轨模式、或按轨道名自定义拆分时，请使用
  [分轨（人声伴奏分离）API](current-music-separate.md)。
- 不需要的轨道可以用[分轨删除 API](current-music-stem-delete.md)隐藏，不要重复提交删除请求。
