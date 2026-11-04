# 上传后翻唱 API

## 接口说明

上传后翻唱用于提交音频文件或音频 URL，并基于该源音频生成新的翻唱版本。

**接口地址**: `POST /api/music/upload-cover`

**计费**: 收费，当前默认 0.6 元/次。该接口是“上传后翻唱”，不是上传图片封面；实际扣费以当前后台价格配置为准。

**Max Mode / Variety**：本接口支持可选参数 `max_mode` 与 `variety`（0-4）。开启 `max_mode`
时本次按 2 倍价格计费（0.6 → 1.2 元/次），`variety` 不额外计费；两者含义与写法见
[新版 API 总览](current-overview.md) 的「高级参数」一节。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。实测多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。**请把客户端超时设置为 300 秒以上；未收到响应不等于没有生成，超时后请勿立即重试（会重复下单、重复扣费）。** 连接中断可稍后用 `GET /api/music/songs` 确认。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

> **音频较大时，建议把「上传」和「翻唱」拆成两步（推荐）**
>
> 本接口要求把**整个音频**放进请求体：音频越大，请求体越大，一旦网络抖动或超时**传到一半就中断**，
> 服务端会返回 `unexpected end of JSON input`（HTTP 400，不扣费）。
>
> 音频超过约 8MB、网络不稳定、或需要复用同一份源素材时，请改用两步式：
>
> 1. `POST /api/music/upload-source` 先上传源音频——**免费、可随时重试**，成功拿到 `clip_id`；
> 2. `POST /api/music/generate-from-source` 用这个 `clip_id` 发起翻唱——**计费步骤的请求体只有约 250 字节**。
>
> 详见[上传源音频 API](current-music-upload-source.md)、[基于源 clip 翻唱 API](current-music-generate-from-source.md)，
> 以及本文末尾的「大文件与请求被截断」。

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
| file_url | string | 否 | - | 源音频 URL |
| file_base64 | string | 否 | - | Base64 音频 |
| file_name | string | 否 | - | 文件名 |
| prompt | string | 否 | - | 新歌词或改编方向 |
| style | string | 否 | - | 风格标签 |
| title | string | 否 | - | 标题 |
| negativeTags | string | 否 | - | 负向风格 |
| instrumental | boolean | 否 | false | 是否纯音乐 |
| waitAudio | boolean | 否 | false | 是否等待音频完成 |
| cover_start_s | number | 否 | - | 翻唱片段开始秒数 |
| cover_end_s | number | 否 | - | 翻唱片段结束秒数 |
| audio_weight | number | 否 | - | 参考音频依赖度，范围 `0.0-1.0`；仅在提供参考音频时可传 |

`cover_start_s` 和 `cover_end_s` 的单位是秒，可以填写小数；开始时间必须小于结束时间，且不能超过源音频时长。两个字段都省略时使用整段音频。`audio_weight` 会映射到 Suno 的 `metadata.control_sliders.audio_weight`，用于控制生成结果对参考音频的依赖程度；取值为 `0.0-1.0`，只有请求中提供有效的 `file_url` 或 `file_base64` 参考音频时才可携带。`0` 是有效值，省略字段表示不指定并沿用 Suno 默认行为。`instrumental`、`waitAudio` 必须传 JSON 布尔值，不要传字符串。

上传接口默认异步返回。响应中的 `clips[].status` 为 `pending` 时，`audio_url` 为空是正常状态，不代表上传或翻唱失败；请保存返回的真实 `song_id`，通过歌曲查询接口轮询到完成后再读取音频地址。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/upload-cover \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "file_url": "https://example.com/source.mp3",
    "file_name": "source.mp3",
    "prompt": "新的中文歌词或改编方向",
    "style": "Mandopop, acoustic guitar",
    "title": "翻唱版本",
    "negativeTags": "noise, low quality",
    "audio_weight": 0.5,
    "instrumental": false,
    "waitAudio": false,
    "cover_start_s": 0,
    "cover_end_s": 60
  }'
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "upload": {
      "clip_id": "uploaded_clip_id",
      "status": "complete"
    },
    "clips": [
      {
        "song_id": "new_clip_id",
        "song_title": "翻唱版本",
        "status": "pending"
      }
    ]
  }
}
```

## 大文件与请求被截断

### 推荐做法：上传与翻唱拆成两步

一次性接口（本接口）把上传和生成合在一步：**大 body 出现在唯一那一步**，一旦中断，既不知道有没有生成、也不好判断有没有扣费。

| | 第 1 步 上传 | 第 2 步 翻唱 |
|---|---|---|
| 接口 | `POST /api/music/upload-source` | `POST /api/music/generate-from-source` |
| 计费 | **免费**（只上传，不生成） | 0.6 元/次；开 Max Mode 为 1.2 元/次 |
| 请求体 | 音频本身（base64 / multipart），或 `file_url` 只传链接 | **约 250 字节**（只传一个 `sourceClipId`） |
| 返回 | `clip_id`（源音频的 clip ID） | `data.clips[].song_id`（生成结果） |
| 失败了怎么办 | 直接重试，**不扣费、不产生生成任务** | 客户端超时设 ≥300 秒；超时先用 `/api/music/songs` 查，不要立刻重试 |
| 源素材复用 | 同一个 `clip_id` 还能继续用于续写 / 替换 / 分轨 | 每次都要重传音频 |

**结论**：音频超过约 8MB、网络不稳定、或同一份素材要用多次 → 用两步式；音频很小且网络稳定 → 用本接口更省事。

### `400 unexpected end of JSON input` 是什么

它的含义是**服务端收到的 JSON 不完整**（不是参数写错、不是权限或余额问题）。常见原因按概率排序：

1. **大 body 传输中途被截断**：接入层会同时记录"客户端声明要发多少"和"实际到达多少"。实测案例：客户端声明 **14.17MB**，实际只到达 **11.8–12.4MB**，三次请求都停在约 **1.6–1.7 秒**处；缺的字节数每次都不同，说明是传输中断而不是固定上限（服务端不限制请求体大小）。
2. **`Content-Length` 与实际发送字节数不一致**：在 Node.js 里用字符串 `.length`（UTF-16 字符数）当长度，遇到中文或多字节内容就会算错。
3. **写 body 时用了字符串而不是 Buffer**，实际写出的字节数与声明不符。

以上三种情况都发生在**扣费之前**，不会产生费用。

### 客户端自查清单

- [ ] `Content-Length` 用 `Buffer.byteLength(json, 'utf8')`（或 `Buffer.from(json).length`）得到，**不要用 `json.length`**；
- [ ] 请求体以 **Buffer** 写出，不写字符串；
- [ ] socket / 请求超时 ≥ **300 秒**；
- [ ] 音频大于约 8MB 时：改用 `file_url`（请求体只有几百字节），或改用 `upload-source` 的 **multipart** 上传，或直接走两步式；
- [ ] multipart 请求**不要手动设置 `Content-Type`**（交给客户端自动带 boundary）；
- [ ] 打印"实际发送字节数"并与 `Content-Length` 比对；
- [ ] 走两步式时，确认第 1 步返回 `clip_id`、`status` 为完成态后，再发第 2 步。

### 常见错误对照

| 报错 | 含义 | 处理 |
|---|---|---|
| `unexpected end of JSON input` | 请求体不完整（被截断） | 按上面自查；或改用两步式 |
| `invalid character '-' in numeric literal` | 把 multipart 的 body 发给了 JSON 接口 | JSON 接口不要用 multipart；或不要手动设 `Content-Type` |
| `one of file_path, file_base64, file_url, or multipart file is required` | 没带音频 | 补 `file_base64` / `file_url` / multipart `file` |
| `model is required` | 请求体是空的合法 JSON（例如 `{}`） | 至少带上 `model` |
| `Invalid request: Invalid request, ...` | 请求体解析失败的包装提示 | 看后半句的具体原因（通常是上面几条之一） |

> 相关接口：[上传源音频 API](current-music-upload-source.md)（第 1 步）、[基于源 clip 翻唱 API](current-music-generate-from-source.md)（第 2 步）。
