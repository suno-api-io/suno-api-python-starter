# 音效生成 API

## 接口说明

音效生成用于创建**几秒钟的音效，不是一首歌**。适合雷声、雨点、撞击声这类短声音，也可以做转场音效、环境声音和鼓点循环；多数在 5 秒以内，最长 20 秒左右，支持**单次**与**循环**两种模式。

**接口地址**: `POST /api/music/sounds`

**计费**: 收费，当前默认 0.6 元/次。实际扣费以当前后台价格配置为准。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。实测多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。**请把客户端超时设置为 300 秒以上；未收到响应不等于没有生成，超时后请勿立即重试（会重复下单、重复扣费）。** 连接中断可稍后用 `GET /api/music/songs` 确认。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

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
| description | string | 是 | - | 描述你想要的声音，用英文短句效果最稳，例如 `cinematic whoosh transition, bright impact` |
| title | string | 否 | - | 标题，不传时可根据描述生成 |
| type | string | 否 | one_shot | 类型：`one_shot`（单次）、`loop`（循环） |
| loop | boolean | 否 | false | 是否循环，等价于把 `type` 写成 `loop` |
| bpm | number | 否 | - | BPM，必须是大于 0 的数字；非法值返回 400（`invalid_sound_bpm`），不会静默忽略 |
| key | string | 否 | - | 调式，格式为音名（C-B）+ 可选 `#`/`b` + 可选 `Major`/`Minor`，例如 `C Major`、`C#m`、`Bb`；空或 `any` 表示不限，非法值返回 400（`invalid_sound_key`） |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/sounds \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "description": "cinematic whoosh transition, bright impact",
    "title": "cinematic whoosh",
    "type": "one_shot",
    "loop": false,
    "bpm": 120,
    "key": "C"
  }'
```

## 响应结果

返回歌曲数组，字段同 [新版 API 总览](current-overview.md) 中的通用歌曲返回字段。
