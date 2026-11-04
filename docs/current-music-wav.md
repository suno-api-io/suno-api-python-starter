# WAV 生成/获取 API

## 接口说明

WAV 接口用于为已有歌曲生成或获取 WAV 无损音频地址。

**接口地址**: `POST /api/music/wav`

**计费**: 免费。该接口用于生成或获取已有歌曲的 WAV 地址，不扣除额度。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理**。实测多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。**请把客户端超时设置为 300 秒以上；未收到响应不等于没有生成，超时后请勿立即重试。** 连接中断可稍后用 `GET /api/music/songs` 确认。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

## 请求参数

### Headers

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | Bearer YOUR_API_KEY |
| Content-Type | string | 是 | application/json |

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| model | string | 是 | - | 模型版本，例如 `suno-v6` |
| audioId | string | 是 | - | 歌曲 ID |
| maxAttempts | number | 否 | 24 | 最大轮询次数 |
| intervalSeconds | number | 否 | 5 | 轮询间隔秒数 |

`maxAttempts` 和 `intervalSeconds` 都是 JSON 数字，`intervalSeconds` 的单位是秒，不是毫秒；通常保持默认值即可。它们只控制本次接口内部等待 WAV 就绪的次数和间隔，不会改变歌曲生成任务本身的状态。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/wav \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "audioId": "clip_id",
    "maxAttempts": 24,
    "intervalSeconds": 5
  }'
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "audioId": "clip_id",
    "status": "complete",
    "wavUrl": "https://media.code-go.com/assets/example.wav"
  }
}
```

## 注意事项

WAV 生成和查询由服务端根据歌曲记录自动选择可用资源，不需要客户提供任何账号信息。

普通歌曲和分轨歌曲使用统一的受控媒体交付链路。WAV 会先由 CN2 下载并落盘，接口成功响应中的 `data.wavUrl` 只返回受控 CDN 地址，不返回 Suno 或 S3 临时源地址。

已存在 `ready` WAV 资产时直接复用，不重复请求 Suno 或搬运文件。尚未准备的 WAV 不会通过 `/api/music/query` 暴露 Suno/S3 地址；调用本接口或统一下载接口后才按需准备。

> **⚠️ WAV 地址有效期：7 天，请及时转存**。返回的 `data.wavUrl` 由平台对象存储提供，默认 7 天后失效（文件到期回收，旧地址返回 404）。请在有效期内把 WAV 转存到你自己的存储；过期后重新调用本接口即可获得新的有效地址。

如果歌曲资源暂时不可用，接口会返回 `409`。请稍后重试；服务端不会返回不稳定的临时地址。
