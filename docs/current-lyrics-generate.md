# 歌词生成 API

## 接口说明

歌词生成用于根据主题、已有歌词上下文和风格要求生成或改写歌词。当前接口已升级为最新歌词生成契约，可直接用于专业模式生成。

**接口地址**：`POST /api/lyrics/generate`

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
| instruction | string | 是 | - | 歌词主题或生成要求 |
| style | string | 否 | - | 风格要求 |
| title | string | 否 | - | 歌曲标题或标题约束 |
| selected | string | 否 | `""` | 选中的待改写文本 |
| context_before | string | 否 | `""` | 前文上下文 |
| context_after | string | 否 | `""` | 后文上下文 |
| mode | string | 否 | `apply_user_request` | 歌词生成模式 |
| references | array | 否 | `[]` | 参考素材列表 |
| num_variants | integer | 否 | `null` | 期望的歌词变体数量 |
| lyricist_id | string | 否 | `null` | 指定歌词作者 ID（歌词作者列表已下线，不建议新接入） |
| metadata | object | 否 | - | 扩展参数，支持 `lyrics_model`、`enable_thinking` |
| lyrics_project_id | string | 否 | `null` | 已有歌词项目 ID（歌词项目系列已下线，不建议新接入） |

`instruction` 兼容旧字段 `theme` 和 `prompt`。`metadata.lyrics_model` 默认 `default`，`metadata.enable_thinking` 默认 `false`。

### 语言控制

当前接口没有独立的 `language` 请求字段。歌词语言由 `instruction` 的内容决定，`style` 只能起辅助作用。

要生成中文歌词，请在 `instruction` 中明确写出目标语言，例如：

```json
{
  "model": "suno-v6",
  "instruction": "请用中文写歌词，主题是夏夜海边重逢",
  "style": "Mandopop, 中文流行"
}
```

也可以写成 `"Write the lyrics in Chinese about ..."`。要生成英文歌词，则写 `"请用英文写歌词"` 或 `"Write the lyrics in English"`。只传英文主题而不说明目标语言时，结果可能是英文。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/lyrics/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "instruction": "关于毕业季和重新出发的中文歌词",
    "style": "流行摇滚，真挚，副歌有记忆点",
    "title": "重新出发",
    "metadata": {
      "lyrics_model": "default",
      "enable_thinking": false
    }
  }'
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "lyrics": "[Verse]\n风吹过操场\n我们挥手告别昨天",
    "edited_lyrics": "[Verse]\n风吹过操场\n我们挥手告别昨天",
    "lyrics_id": "lyrics_id",
    "lyrics_request_id": "lyrics_request_id"
  }
}
```

`edited_lyrics` 是应填入歌词框的完整歌词。`lyrics_id` 和 `lyrics_request_id` 可用于追踪，可能因接口返回情况为空；不要把它们当作歌曲 ID。

## 兼容说明

- 旧字段 `theme`、`prompt` 仍可使用，会映射为 `instruction`。
- 「歌词项目 / 歌词作者」系列接口已下线：需要留存生成结果时，请自行保存接口返回的 `edited_lyrics`。
