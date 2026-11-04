# 灵感提示词 API

## 接口说明

灵感提示词接口用于获取随机歌曲描述、歌词主题和风格标签建议，适合做“随机灵感”和“刷新标签”按钮。

**接口地址**：`POST /api/prompts/suggestions`

**计费**：免费额度内不收费（每个用户每分钟最多 10 次，每天最多 300 次）；超出免费额度后按 0.1 元/次收费。

**超限识别**：超出免费额度时请求仍会正常执行，响应头会带 `X-Suno-Helper-Free: false` 和 `X-Suno-Helper-Over-Limit: minute`（或 `day`），可据此在客户端提示本次已按次计费。

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

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/prompts/suggestions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6"
  }'
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "prompts": ["A dreamy synth-pop track about city lights after rain"],
    "lyrics_prompts": ["写一首关于夜晚、重逢和遗憾的中文歌词"],
    "tags": ["dreamy synth-pop", "warm piano", "male vocal"],
    "is_pending_personalization": false
  }
}
```

## 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| prompts | string[] | 歌曲描述灵感 |
| lyrics_prompts | string[] | 歌词主题灵感 |
| tags | string[] | 风格标签建议，Create 风格卡片应使用该数组 |
| is_pending_personalization | boolean | 个性化建议是否仍在等待生成 |
