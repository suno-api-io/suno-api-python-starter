# 分轨删除 API

## 接口说明

分轨删除用于把已经生成的分轨轨道从列表里隐藏。删除是**软删除**：后端只给分轨行打
`stem_hidden` 标记，底层音频、MIDI 与下载资源都保留，同一首歌之后仍可以再次分离出新的分轨。

**接口地址**：`POST /api/music/stem-delete`

**计费**：免费。删除只更新平台内的可见状态，不调用 Suno，也不产生扣费。

**推荐模型**：`suno-v6`。可用 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`。

## 认证

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

## 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| song_id | string | 否 | - | 单条分轨轨道的 `song_id`（`/api/music/separate` 返回的轨道 ID） |
| song_ids | string[] | 否 | - | 批量写法，一次最多 100 条 |
| stem_batch_id | string | 否 | - | 按批次删除：删掉这一批自动分轨的全部轨道 |
| stem_mode | string | 否 | - | 按模式删除：例如 `two`、`twelve` |

`song_id` / `song_ids` / `stem_batch_id` / `stem_mode` 至少要提供一个，否则返回 400。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/stem-delete \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_ids": ["stem_track_id_1", "stem_track_id_2"]
  }'
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "hidden": 2,
    "affected_sources": 1
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| hidden | number | 本次隐藏的轨道条数 |
| affected_sources | number | 受影响的源歌曲数量 |

## 注意事项

- 幂等：轨道已隐藏或 ID 不存在时返回 `hidden: 0`，不会报错，重复调用安全。
- 删除只影响当前 API Key 所属的歌曲；不属于自己的轨道不会被改动。
- 列表里最后一条可见分轨被隐藏后，源歌曲的「已分轨」标记会随之清除。
