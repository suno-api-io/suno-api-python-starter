# 专业模式生成 API

## 接口说明

专业模式适合已经准备好歌词、风格和标题，并希望控制演唱声音、风格参考强度和生成随机度的场景。

**接口地址**: `POST /api/music/create/custom`

**计费**: 收费，当前默认 0.6 元/次。每次通常返回 2 首歌曲，实际扣费以后台价格配置为准。

**Max Mode / Variety**：本接口支持可选参数 `max_mode` 与 `variety`（0-4）。开启 `max_mode`
时本次按 2 倍价格计费（0.6 → 1.2 元/次），`variety` 不额外计费；两者含义与写法见
[新版 API 总览](current-overview.md) 的「高级参数」一节。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。实测多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。**请把客户端超时设置为 300 秒以上；未收到响应不等于没有生成，超时后请勿立即重试（会重复下单、重复扣费）。** 连接中断可稍后用 `GET /api/music/songs` 确认。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

## 请求参数

### Headers

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| model | string | 否 | `suno-v6` | 对客模型名：`suno-v6`、`suno-v6-wild` 或 `suno-v6-mini` |
| lyrics | string | 否 | - | 歌词；纯音乐时可为空 |
| style_tags | string | 是 | - | 风格标签，多个标签可用逗号分隔 |
| song_title | string | 否 | - | 歌曲标题 |
| instrumental | boolean | 否 | `false` | 是否生成纯音乐 |
| negative_tags | string | 否 | - | 不希望出现的风格或效果 |
| vocal_gender | string | 否 | - | 声音性别：`m`、`f`、`male` 或 `female` |
| style_weight | number | 否 | - | 风格参考度，范围 `0.0` 到 `1.0` |
| weirdness_constraint | number | 否 | - | 随机度，范围 `0.0` 到 `1.0` |
| wait_completion | boolean | 否 | `false` | 是否等待生成完成后再返回 |

## 高级参数说明

### 声音性别 `vocal_gender`

- 男声传 `m` 或 `male`，女声传 `f` 或 `female`。
- 服务端会将 `male`、`female` 分别规范化为 `m`、`f`。
- 当 `instrumental=true` 时，不会向生成服务发送声音性别参数。

### 风格参考度 `style_weight`

控制生成结果对 `style_tags` 的参考强度。值越高，生成结果通常越倾向遵循所填写的风格标签。

### 随机度 `weirdness_constraint`

控制生成结果的变化和实验性倾向。值越高，结果通常越有变化；值越低，结果通常越稳妥。

两个数值参数的范围均为 `0.0` 到 `1.0`，其中 `0` 是有效的显式值。只有完全不传字段时，才表示不指定该项。

填写时请注意：这两个参数是比例小数，不是百分比整数。推荐参考：`0.0` 到 `0.3` 偏保守，`0.4` 到 `0.6` 较均衡，`0.7` 到 `1.0` 更偏实验性；没有明确偏好时可使用 `0.5`，也可以直接省略。示例：`weirdness_constraint: 0.5`，不要填写 `50` 或 `50%`。

`instrumental=true` 时会生成纯音乐，歌词和声音性别不会按人声歌曲方式生效；如需要人声，请传 `false` 或省略该字段。布尔字段必须使用 JSON 的 `true`/`false`，不要使用字符串。

## Python 请求示例

```python
import requests

response = requests.post(
    'https://www.suno-api.io/api/music/create/custom',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json={
        'model': 'suno-v6',
        'lyrics': '[Verse]\n夜色落在海面上\n晚风轻轻经过窗',
        'style_tags': 'Mandopop, acoustic guitar, warm vocal',
        'song_title': '海边的晚风',
        'vocal_gender': 'male',
        'style_weight': 0.68,
        'weirdness_constraint': 0.32,
    },
    timeout=300,
)
response.raise_for_status()
songs = response.json()
```

## 受理回执模式（可选）

本接口同样支持[灵感模式生成 API](current-music-create.md) 里的**受理回执模式**：请求体加
`"accept_mode": "async"`（或请求头 `X-Accept-Mode: async`）时，接口立刻返回 `202` 和受理号，
生成在后台继续，用 `GET /api/music/requests/{request_id}` 查询进度。

适用于客户端不适合挂长连接、或不想因为超时误判"没有生成"的场景。**不带该参数时行为与以前完全一致。**

```bash
curl -X POST https://www.suno-api.io/api/music/create/custom \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  -d '{
    "style_tags": "Mandopop, acoustic guitar, warm vocal",
    "song_title": "海边的晚风",
    "vocal_gender": "male",
    "accept_mode": "async"
  }'
```

返回结构与轮询方式见[灵感模式生成 API](current-music-create.md) 的「受理回执模式」一节。

## 参数校验

以下情况会返回 HTTP `400`，错误响应的 `message` 会指出无效字段：

- `style_weight` 或 `weirdness_constraint` 不是数字。
- 数值小于 `0.0` 或大于 `1.0`。
- `vocal_gender` 不是 `m`、`f`、`male`、`female` 之一。

### 文本字段长度上限

以下字段超长同样返回 HTTP `400`，**且不会进入生成、不会预扣费**。计数口径与 Suno 网页端一致：**按 UTF-16 码元**（常用中文/英文算 1，emoji 与增补平面生僻字算 2），**不做 trim**，首尾空格与换行都计入。

| 字段 | `suno-v6` 系列（含不传） | `suno-v4` / `v3.5` / `v3` / `v2` |
|---|---:|---:|
| `prompt`（歌词，兼容 `lyrics`） | **5000** | **3000** |
| `style_tags`（风格，兼容 `tags`、`style`） | **1000** | **200** |
| `negative_tags`（排除风格） | **1000** | **1000** |
| `song_title`（标题，兼容 `title`） | **100** | **100** |

错误信息形如 `style_tags must not exceed 1000 characters; received 2772`：**第一个词是超限的字段名，末尾是实际字数**，拿到 400 直接按这两个数字裁剪即可，不用逐个字段试。通用约定见[新版 API 总览](current-overview.md)的「文本字段长度上限」。

## 响应结果

接口通常返回包含 2 首歌曲的数组。异步请求初始状态一般为 `pending`，请保存 `song_id`，并通过[歌曲查询 API](current-music-query.md)获取最终状态和音频地址。歌曲字段同[灵感模式生成 API](current-music-create.md)。

## 兼容字段

| 推荐字段 | 兼容字段 |
|---|---|
| `vocal_gender` | `vocalGender` |
| `style_weight` | `styleWeight` |
| `weirdness_constraint` | `weirdnessConstraint` |

新接入请统一使用 snake_case。若同一请求同时传入 snake_case 和 camelCase，**snake_case 的值优先**。
