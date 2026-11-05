# 支持的模型版本

## 当前可用的普通生成模型

对客请求只使用下表中的平台模型名。

| 对客模型名 | 对客显示名称 | 用途 | 状态 |
|---|---|---|---|
| `suno-v6` | Suno V6 | 普通生成默认模型 | 当前可用 |
| `suno-v6-wild` | Suno V6 Wild | V6 Wild 变体 | 当前可用 |
| `suno-v6-mini` | Suno V6 Mini | V6 Mini 变体 | 当前可用 |

默认推荐模型：`suno-v6`。

## 分轨说明

分轨是独立的固定能力，不需要客户填写或选择歌曲生成模型。调用分轨接口时只需提供源歌曲和分轨模式，例如 `two` 或 `twelve`；实际返回数量以接口响应为准。

## 模型参数

在生成类 API 中，`model` 通常是可选的：

- 不填写：使用当前默认模型 `suno-v6`。
- 填写：只能使用 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`。
- 只能填写上表中的对客模型名。

### 简易生成示例

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  -d '{
    "description": "一首轻快的流行歌曲",
    "model": "suno-v6"
  }'
```

> **等待时间与超时（重要）**：生成接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。实测多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。请把客户端超时设置为 300 秒以上（示例中的 `--max-time 300`）；**未收到响应不等于没有生成**，超时后请勿立即重试。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

### V6 变体示例

```json
{
  "model": "suno-v6-wild",
  "description": "一首具有实验性结构的电子音乐"
}
```

## 已下线模型

以下模型已不再作为新建请求的当前可用选项：

- `suno-v2`
- `suno-v3`
- `suno-v3-5`
- `suno-v4`
- `suno-v4-5`
- `suno-v4-5-all`
- `suno-v4-5-plus`
- `suno-v5`
- `suno-v5-5`

历史歌曲和历史任务仍可能在查询结果中保留旧的 `model_name` 或 `model_version`，这不代表旧模型可以继续提交新任务。

为兼容仍在运行的旧客户端，如果请求里填写了已下线的模型名，服务端会直接把该次请求按当前默认模型 `suno-v6` 处理，并在任务记录中返回 `suno-v6`，不会返回“模型不可用”错误。建议尽快把请求示例更新为上表中的当前模型名。

## 查询模型列表

`GET /v1/models` 的普通歌曲模型至少应包含：

```json
{
  "object": "list",
  "data": [
    { "id": "suno-v6", "object": "model", "owned_by": "suno" },
    { "id": "suno-v6-wild", "object": "model", "owned_by": "suno" },
    { "id": "suno-v6-mini", "object": "model", "owned_by": "suno" }
  ]
}
```

响应也可能包含歌词、兼容路由或平台内部的其他模型。它们不应与普通歌曲生成的 V6 模型列表混淆。

## 响应字段说明

查询结果中的 `model_version`、`model` 或 `model_name` 可能来自平台保存值或接口返回值：

- 对客保存的当前普通生成模型通常显示为 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`。
- 接口返回的模型字段以平台对客模型名为准。
- 历史任务可能显示已下线的旧模型名。客户端应把它们作为历史数据展示，不要据此重新提交请求。
