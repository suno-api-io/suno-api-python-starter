# 基于源 clip 翻唱 API

## 接口说明

基于源 clip 翻唱用于复用已经上传或已有的源 clip，并基于它生成新的翻唱版本。

**接口地址**: `POST /api/music/generate-from-source`

**计费**: 收费，当前默认 0.6 元/次。上传源音频本身免费，基于源 clip 生成翻唱时收费；实际扣费以当前后台价格配置为准。

**Max Mode / Variety**：本接口支持可选参数 `max_mode` 与 `variety`（0-4）。开启 `max_mode`
时本次按 2 倍价格计费（0.6 → 1.2 元/次），`variety` 不额外计费；两者含义与写法见
[新版 API 总览](current-overview.md) 的「高级参数」一节。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。实测多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。**请把客户端超时设置为 300 秒以上；未收到响应不等于没有生成，超时后请勿立即重试（会重复下单、重复扣费）。** 连接中断可稍后用 `GET /api/music/songs` 确认。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

> **推荐用法：它是「两步式翻唱」的第 2 步。**
> 第 1 步先用[上传源音频 API](current-music-upload-source.md) 上传（**免费**）拿到 `clip_id`，
> 第 2 步再用本接口发起翻唱。这样**音频只出现在免费那一步**：传坏了直接重试，不会扣费，
> 而计费这一步的请求体只有**几百字节**，几乎不可能因为传输中断而失败。
> 一次性的[上传后翻唱 API](current-music-upload-cover.md) 会把整个音频放进请求体，
> 音频超过约 8MB 时容易因为传输被截断而返回 `unexpected end of JSON input`（详见该页的「大文件与请求被截断」）。
>
> 另外，同一个 `clip_id` 可以重复用于续写、替换片段、分轨等后续动作，不必重复上传音频。

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
| sourceClipId | string | 是 | - | 源 clip ID；可使用上传源音频返回的 `clip_id`、已有歌曲的真实 `song_id`，或强化上传完成后返回的真实 `song_id` |
| sourceAudioUrl | string | 否 | - | 源音频 URL |
| sourceTitle | string | 否 | - | 源音频标题 |
| prompt | string | 否 | - | 新歌词或创作方向 |
| customMode | boolean | 否 | true | 是否使用专业模式 |
| style | string | 否 | - | 风格标签 |
| title | string | 否 | - | 标题 |
| negativeTags | string | 否 | - | 负向风格 |
| instrumental | boolean | 否 | false | 是否纯音乐 |
| waitAudio | boolean | 否 | false | 是否等待音频完成 |
| vocalGender | string | 否 | - | 演唱性别 |
| lyricsMode | string | 否 | - | 歌词模式 |
| weirdnessConstraint | number | 否 | - | 随机度 |
| styleWeight | number | 否 | - | 风格影响权重 |
| audio_weight | number | 否 | - | 参考音频依赖度，范围 `0.0-1.0`；仅在提供源 clip 或参考音频时可传 |

`weirdnessConstraint`、`styleWeight` 和 `audio_weight` 的取值均为 `0.0` 到 `1.0` 的比例小数，不是百分比整数；例如 50% 应填写 `0.5`。`0` 是有效值，省略字段才表示不指定。`audio_weight` 会映射到 Suno 的 `metadata.control_sliders.audio_weight`，用于控制生成结果对参考音频的依赖程度；只有请求中存在有效的 `sourceClipId` 或参考音频时才可携带，普通纯文本生成不要传。`customMode=true` 时，`prompt` 应填写新歌词，`style` 和 `title` 应同时提供；`customMode=false` 时，`prompt` 应填写创作描述。`instrumental`、`waitAudio` 必须使用 JSON 布尔值 `true`/`false`。

本接口默认异步返回。返回的 `status` 为 `pending` 时，`audio_url` 为空属于正常现象；请等待完成后再使用音频地址。`sourceClipId` 必须是真实源歌曲/clip ID，不能使用 `task_id`、`client_request_id` 或 `pending:` 占位 ID。

### `sourceClipId` 是什么 ID

`sourceClipId` 表示作为本次翻唱来源的真实 Suno clip 标识。平台对外的歌曲对象通常把这个标识命名为 `song_id`，而翻唱请求参数沿用 `sourceClipId`；在这里二者表示同一个真实歌曲 ID。

如果来源是强化上传，请先查询强化上传任务，等待 `status` 变为 `completed`，然后把返回的真实 `song_id` 填入 `sourceClipId`。建议同时把该结果的 `audio_url` 和 `title` 分别填入 `sourceAudioUrl`、`sourceTitle`。

不要把强化上传的 `task_id`、`client_request_id` 或 `pending:enhanced-upload:*` 占位 ID 填入 `sourceClipId`。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/generate-from-source \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "sourceClipId": "uploaded_or_existing_clip_id",
    "sourceAudioUrl": "https://example.com/source.mp3",
    "sourceTitle": "原始音频标题",
    "prompt": "新的歌词或创作方向",
    "customMode": true,
    "style": "Mandopop, warm vocal",
    "title": "翻唱标题",
    "negativeTags": "noise",
    "audio_weight": 0.5,
    "instrumental": false,
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
        "song_id": "new_clip_id",
        "song_title": "翻唱标题",
        "status": "pending"
      }
    ],
    "source_update": {}
  }
}
```

## 说明

该接口会尽量处理源 clip 所属账号问题。若源 clip 无法直接使用，服务端可能根据源音频信息重新上传后再生成。
