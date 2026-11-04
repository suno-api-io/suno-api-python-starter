# 上传源音频 API

## 接口说明

上传源音频用于把本地音频或远程音频上传为后续翻唱、续写、替换、分轨等能力可使用的源 clip。

**接口地址**: `POST /api/music/upload-source`

**计费**: 免费。该接口只上传源音频，不开始生成任务。

> **推荐用法：它是「两步式翻唱」的第 1 步。**
> 先用本接口把音频传上来（**免费、失败可随时重试**），拿到返回的 `clip_id`；确认上传成功（`status` 为完成态）后，
> 再调用[基于源 clip 翻唱 API](current-music-generate-from-source.md) 发起翻唱——那一步的请求体只有几百字节，
> 不会因为音频太大而在传输中被截断。相比一次性接口[上传后翻唱 API](current-music-upload-cover.md)，
> 这种拆法在**音频较大、网络不稳定、或同一份素材要复用多次**（续写 / 替换 / 分轨）时更稳。

### 大文件上传建议

| 情况 | 建议做法 |
|---|---|
| 音频已在公网（有 https 直链） | 用 `file_url`：**请求体只有几百字节**，最稳 |
| 本地文件（Node / Python / 桌面端） | 用 **multipart** 上传（`-F "file=@source.mp3"`），并**不要手动设置 `Content-Type`** |
| 只能用 JSON + base64 | 注意 `Content-Length` 要用字节数（`Buffer.byteLength`），否则请求体可能被截断 |

上传完成后，务必先确认响应里的 `status` 已是完成态、并保存 `clip_id`，再进入第 2 步；
上传失败**不会扣费、也不会产生生成任务**，直接重试即可。

## 请求参数

### Headers

JSON 请求：

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | Bearer YOUR_API_KEY |
| Content-Type | string | 是 | application/json |

multipart 请求不要手动指定 `Content-Type`，由客户端自动生成。

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| model | string | 否 | suno-v6 | 对客模型名：`suno-v6`、`suno-v6-wild` 或 `suno-v6-mini` |
| file_url | string | 否 | - | 远程音频 URL |
| file_base64 | string | 否 | - | Base64 音频 |
| file_name | string | 否 | - | 文件名 |
| upload_type | string | 否 | file_upload | 上传类型 |

## JSON 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/upload-source \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "file_url": "https://example.com/source.mp3",
    "file_name": "source.mp3",
    "upload_type": "file_upload"
  }'
```

## multipart 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/upload-source \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@source.mp3" \
  -F "file_name=source.mp3" \
  -F "upload_type=file_upload" \
  -F "model=suno-v6"
```

## 响应结果

```json
{
  "clip_id": "uploaded_clip_id",
  "status": "complete",
  "title": "source.mp3",
  "image_url": "https://...",
  "audio_url": "https://...",
  "display_tags": "pop, vocal",
  "inferred_description": "uploaded source audio",
  "clip_metadata": {}
}
```
