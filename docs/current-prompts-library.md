# Prompt/Style 资源列表 API

## 接口说明

Prompt/Style 资源列表用于读取当前账号已保存的 Prompt 和 Style 资源，适合初始化选择器或历史资源列表。

**接口地址**：`POST /api/prompts/library`

**计费**：免费额度内不收费（每个用户每分钟最多 10 次，每天最多 300 次）；超出免费额度后按 0.1 元/次收费。

**超限识别**：超出免费额度时请求仍会正常执行，响应头会带 `X-Suno-Helper-Free: false` 和 `X-Suno-Helper-Over-Limit: minute`（或 `day`），可据此在客户端提示本次已按次计费。

**推荐模型**：`suno-v6`。

## 认证

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

## 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| model | string | 是 | - | 对客模型名：`suno-v6`、`suno-v6-wild` 或 `suno-v6-mini` |
| per_page | integer | 否 | 100 | 返回数量，范围 1-100 |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/prompts/library \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "per_page": 100
  }'
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "prompt_id",
      "title": "Prompt title",
      "prompt": "Prompt text",
      "style": "Style text"
    }
  ]
}
```

资源字段以实际响应为准；该接口适合读取已保存资源，不替代实时的[灵感提示词 API](current-prompts-suggestions.md)。
