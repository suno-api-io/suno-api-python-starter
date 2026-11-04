# 演讲（Speech）生成 API

## 接口说明

演讲（Speech）用于把**演讲稿或一句话描述**生成"说话/演讲"音频，可选是否配背景音乐。
适合演讲、致辞、旁白、口播稿、有声内容等场景。

> **请注意**：本接口生成的是**说话音频**，不是演唱歌曲（没有旋律、没有歌唱人声）。
> 需要唱歌请使用[灵感模式生成 API](current-music-create.md) 或[专业模式生成 API](current-music-create-custom.md)。

**接口地址**: `POST /api/music/speech`

**计费**: 收费，当前默认 0.6 元/次。每次通常返回 2 条音频，实际扣费以后台价格配置为准。

**Max Mode / Variety**：本接口支持可选参数 `max_mode` 与 `variety`（0-4）。开启 `max_mode`
时本次按 2 倍价格计费（0.6 → 1.2 元/次），`variety` 不额外计费；两者含义与写法见
[新版 API 总览](current-overview.md) 的「高级参数」一节。

> **等待时间与超时（重要）**：本接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。
> 实测多数请求数秒内返回（1–10 秒）；但与其它同步生成接口一样，极端情况下可能更久，
> **请把客户端超时设置为 300 秒以上；
> 未收到响应不等于没有生成，超时后请勿立即重试（会重复下单、重复扣费）。**
> 连接中断可稍后用 `GET /api/music/songs` 确认。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

> **内容合规**：平台会对演讲稿做版权与内容策略校验。若被判定为涉及版权材料（例如直接引用他人歌词、
> 知名作品原文），本次会**生成失败并自动全额退费**。改用你自己的表述、把引用改成转述后再试即可。

## 请求参数

### Headers

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| script | string | 是 | - | 演讲稿全文；**最多 5000**（v6 档，按 UTF-16 码元；超长返回 400，不扣费） |
| tone | string | 否 | - | 语气/语速/情绪/场景描述，如"激昂有力，语速由慢到快；学校礼堂"；**最多 1000 字符** |
| song_title | string | 否 | - | 标题；**最多 100 字符** |
| gender | string | 否 | 不限 | 演讲者性别：`m`、`f`（兼容 `male`、`female`）；也可用 `vocal_gender` 传同一个值 |
| backing_music | boolean | 否 | `true` | 是否配背景音乐；`false` 为纯人声演讲 |
| model | string | 否 | `suno-v6` | 对客模型名：`suno-v6`、`suno-v6-wild` 或 `suno-v6-mini` |
| wait_completion | boolean | 否 | `false` | 是否等待生成完成后再返回 |
| max_mode | boolean | 否 | `false` | 开启后本次按 2 倍价格计费 |
| variety | integer | 否 | - | 风格变化程度 `0`-`4`，见总览「高级参数」 |

> 本接口**不支持** `duration`（时长参数）：传了会返回 HTTP 400，不做静默忽略。
> 演讲时长由 `script` 的内容长度决定。

## 请求示例

### 最小请求（只需要演讲稿）

```bash
curl -X POST https://www.suno-api.io/api/music/speech \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  -d '{
    "script": "各位老师、各位同学，大家好！今天我演讲的题目是《不负时光，奋力前行》。"
  }'
```

### 完整请求（指定语气、性别、关闭背景音乐）

```bash
curl -X POST https://www.suno-api.io/api/music/speech \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  -d '{
    "script": "Good evening everyone, thank you all for coming to celebrate this special day with us.",
    "tone": "warm and slow, wedding reception",
    "song_title": "Wedding Toast",
    "gender": "f",
    "backing_music": false,
    "model": "suno-v6"
  }'
```

### Python 示例

```python
import requests

response = requests.post(
    'https://www.suno-api.io/api/music/speech',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},
    json={
        'script': '各位同事，下午好。下面汇报一下本周的进展。',
        'tone': '平稳清晰，会议汇报',
        'gender': 'male',
        'backing_music': True,
    },
    timeout=300,
)
response.raise_for_status()
items = response.json()          # 通常 2 条
for item in items:
    print(item['song_id'], item['status'])
```

## 参数说明

### `script`（演讲稿，必填）

- 直接粘贴你要讲的内容；**也支持写一句描述让模型自己生成演讲稿**
  （例如"给一支落后二十分的球队做中场动员，从低声到全场咆哮"）。
- 换行、段落、`[停顿]` 之类的舞台提示都可以直接写进去，模型会尽量遵循。
- 上限 **5000**（v6 系列；按 UTF-16 码元统计，emoji 算 2），超长返回 400 且不扣费。

### `tone`（语气与场景，可选）

用来描述"怎么讲"，而不是"讲什么"。建议包含四类信息：语气、语速/节奏、情绪、场景。

```text
激昂有力，语速由慢到快，停顿明显；学校礼堂，面向全校师生
温暖柔和，语速平缓；婚礼宴会现场
沉稳克制，匀速清晰；董事会汇报
```

上限 **1000 字符**。不填时由模型按 `script` 的内容自行判断。

### `gender` / `vocal_gender`（演讲者性别，可选）

- 男声传 `m` 或 `male`，女声传 `f` 或 `female`；服务端会统一规范化为 `m` / `f`。
- **两个字段名都支持，二选一即可**：`gender` 是本接口的推荐写法；如果你已经在用
  [专业模式](current-music-create-custom.md)，直接沿用 `vocal_gender` 也可以。
- **不传表示"不限"**，由模型自行决定。

### `backing_music`（背景音乐，可选）

- 默认 `true`（配背景音乐），与 Suno 网页版的默认一致。
- 传 `false` 得到纯人声演讲，适合后续自行配音/配乐。
- 必须是 JSON 布尔值 `true` / `false`；字符串 `"true"`、`"1"` 也接受，但建议用布尔值。

### `model`（模型，可选）

三个对客模型都可用且**同价**（0.6 元/次）。演讲由 Suno v6 系列引擎生成；不填时按默认
`suno-v6` 处理。除非你有明确偏好，通常不需要传这个字段。

## 参数校验与文本上限

以下情况会返回 HTTP `400`，**都在扣费之前拦截，不会产生费用**：

| 情况 | 错误信息 |
|---|---|
| 没有传 `script`，或只传了空白 | `script is required for speech` |
| `gender` 不是 `m`/`f`/`male`/`female` | `gender must be one of m, f, male, female` |
| `backing_music` 不是布尔值 | `backing_music must be a boolean` |
| 传了不支持的 `duration` | `duration is not supported on /api/music/speech` |

### 文本字段长度上限

超长同样返回 HTTP `400`，**不会进入生成、不会预扣费**。计数按 **UTF-16 码元**（常用中文/英文算 1，
emoji 与增补平面生僻字算 2），**不做 trim**，首尾空格与换行都计入：

| 字段 | 上限 |
|---|---|
| `script`（演讲稿） | **5000**（v6 档；老模型 3000） |
| `tone`（语气描述） | **1000** |
| `song_title`（标题） | **100** |

错误信息形如 `script must not exceed 5000 characters; received 5120`：
**第一个词是超限的字段名，末尾是实际字数**，拿到 400 直接按这两个数字裁剪即可。

## 响应结果

返回与其它生成接口**完全一致**的歌曲数组（通常 2 条），保存 `song_id` 后按
[歌曲查询 API](current-music-query.md) 查询最终状态与音频地址：

```json
[
  {
    "song_id": "b7529174-b495-465b-8c5e-cd21bea2df8c",
    "song_title": "不负时光",
    "status": "pending",
    "audio_url": "",
    "cover_url": "",
    "video_url": "",
    "model_version": "suno-v6",
    "generation_type": "generate",
    "created_at": "2026-10-08T01:00:00Z"
  }
]
```

| 字段 | 说明 |
|---|---|
| `song_id` | 曲目 ID，后续查询/下载都用它 |
| `status` | `pending`（已提交、生成中）、`processing`、`completed`（已完成）、`failed`（失败） |
| `song_title` | 标题（未传 `song_title` 时由模型生成，可能为空） |
| `audio_url` | 音频地址；生成完成前为空，完成后可直接下载或播放 |

### 生成失败与退款

生成失败时，本次费用会**自动全额退回**，不需要联系客服。失败原因可在响应或
[歌曲查询 API](current-music-query.md) 的 `error_message` 里看到。

最常见的失败原因是**内容被平台判定为涉及版权材料**，例如：

```text
Your lyrics contain copyrighted material. Please change it and try again.
```

遇到这种情况，把稿件换成你自己的表述（或把引用改成转述）后重新提交即可。

## 常见问题

**Q：为什么生成出来是"说话"，不是唱歌？**
A：本接口就是演讲接口，输出为说话音频。要唱歌请用生成/专业模式接口。

**Q：每次为什么返回 2 条？**
A：与本平台其它生成接口一致，一次生成产出 2 条候选，按 `song_id` 分别查询，选满意的一条即可。

**Q：怎么控制时长？**
A：由 `script` 的长度决定，本接口不接受 `duration` 参数。

**Q：可以指定音色（比如我克隆的声音）吗？**
A：当前版本不支持。演讲使用固定的演讲音色，可用 `gender` 指定男声/女声；
如需用自己的声音，请使用[克隆音色 API](current-clone-voice.md) 的相关能力。

**Q：`tone` 不填会怎样？**
A：模型会按 `script` 的内容自行判断语气与节奏。要稳定复现某个风格，建议把语气、语速、场景写进 `tone`。

## 兼容字段

| 推荐字段 | 兼容字段 | 说明 |
|---|---|---|
| `gender` | `vocal_gender` | 两者传其一即可，`m`/`f`/`male`/`female` 均可 |

新接入请统一使用 snake_case。其余字段（`script`、`tone`、`song_title`、`backing_music`）没有 camelCase 别名。

## 下一步

拿到 `song_id` 后：

1. 用[歌曲查询 API](current-music-query.md) 查询生成状态与音频地址；
2. 完成后用[歌曲媒体下载与试听 API](current-music-media-download.md) 下载或试听；
3. 想批量下载或转存，见[下载中心相关接口](current-music-free2.md)。
