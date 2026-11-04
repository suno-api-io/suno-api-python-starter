# 风格增强 API

## 接口说明

风格增强用于把简短风格标签扩展成更完整、更适合 Suno 生成的风格描述，也可以根据完整歌词生成风格段落。

**接口地址**：`POST /api/music/boost-style`

**计费**：免费额度内不收费（每个用户每分钟最多 10 次，每天最多 300 次）；超出免费额度后按 0.1 元/次收费。

**超限识别**：超出免费额度时请求仍会正常执行，响应头会带 `X-Suno-Helper-Free: false` 和 `X-Suno-Helper-Over-Limit: minute`（或 `day`），可据此在客户端提示本次已按次计费。

**推荐模型**：`suno-v6`。可用 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`。

**中文输出**：当请求内容（`originalTags`/`lyrics`/`user_guidance`）包含中文且未自行声明语言时，服务会自动在 `original_tags` 后追加 `（请用中文描述）`，并补充 `user_guidance=语言：简体中文；乐器名也用中文`，以提高中文风格描述的命中率。实际下发的取值会在响应里的 `appliedOriginalTags`、`appliedUserGuidance` 返回。若传入内容已明确写了语言（例如“用简体中文描述”），服务不会做任何改写。

## 认证

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

## 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| model | string | 是 | - | 对客模型名：`suno-v6`、`suno-v6-wild` 或 `suno-v6-mini` |
| originalTags | string | 否 | - | 原始风格标签 |
| original_tags | string | 否 | - | `originalTags` 的兼容别名 |
| style | string | 否 | - | 原始风格标签，和 `originalTags` 二选一 |
| instrumental | boolean | 否 | false | 是否按纯音乐方向增强 |
| lyrics | string | 否 | - | 完整歌词；传入后按歌词内容生成风格描述 |
| user_guidance | string | 否 | - | 用户自然语言要求，例如「加入唢呐和二胡，男声，节奏更快」；平台侧同名字段，直接透传 |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/boost-style \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "originalTags": "pop, piano, male vocal",
    "lyrics": "[Verse]\n夜色落在窗前\n[Chorus]\n我们向光而行",
    "user_guidance": "加入唢呐和二胡，男声，节奏更快",
    "instrumental": false
  }'
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "originalTags": "pop, piano, male vocal",
    "instrumental": false,
    "upsampledStyle": "Mandopop, expressive male vocal, warm piano ballad...",
    "requestId": "request_id"
  }
}
```

`upsampledStyle` 是应写回 Style 输入框的完整风格描述。
