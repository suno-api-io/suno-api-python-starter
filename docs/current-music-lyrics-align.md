# 歌词时间戳校准 API

> **这不是语音识别。** 文字**永远采用你给的歌词原文**，我们只负责把每个字放到正确的时间点上——所以不会出现"识别错别字导致歌词对不上"的情况。

## 接口说明

把**已有的歌词**和**音频**对齐，输出**逐行 + 逐字**的时间戳，用于卡拉OK逐字高亮、滚动歌词、字幕生成。

**接口地址**: `POST /api/music/lyrics-align`

**认证**: 见[认证说明](authentication.md)，请求头 `Authorization: Bearer YOUR_API_KEY`

**计费**: 按次计费（当前默认 0.1 元/次）；平台歌曲勾选人声分离时，另按平台「人声/伴奏分离」价格计一次。实际扣费以当前后台价格配置为准。

**平均耗时**: 5–15 秒（视音频长度、以及是否需要现场做人声分离而定）

## 为什么需要校准：生成侧的时间戳并不总是准

[时间轴歌词 API](current-lyrics-timeline.md) 直接返回生成侧的逐词时间戳，**存在不准确性**：

- 重唱、和声重、说唱、长音段落容易出现整体偏移或个别字错位；
- 部分歌曲开头会缺一段（例如纯前奏，第一个片段从十几秒才开始）；
- 某些歌词行很难拿到明确的时间锚点。

歌词时间戳校准是在**你自己提供的歌词**基础上重新做时间对齐：**只校正时间，不改文字**，适合对"能不能对上"要求高的场景（KTV 逐字高亮、逐字字幕、跟唱评分）。

**推荐做法（三步，效果最好）**

1. **先提取纯人声**（人声/伴奏分离），只把人声轨拿去对齐——伴奏与和声不再干扰。
   实测依据：同一首歌的「全曲 vs 人声轨」逐行对比里，28 行有 **5 行差异超过 0.25 秒**（最大 2.64 秒）；
   两个互相独立的引擎在**人声轨**上的平均差 0.239 秒、在**全曲**上 0.508 秒——一致度几乎差一倍。
   所以做逐字高亮（KTV/字幕）建议开启。（具体提升幅度正在用新引擎重新测。）
2. **提供完整歌词**：整首歌、按行、和音频一一对应。漏句或段落缺失会让后面的行整体错位；歌词里不要带 `[00:23.82]` 这类时间戳（带了会自动忽略）。
3. 平台歌曲可以直接勾 `vocal_separate: true`，由我们一步完成"分离 + 对齐"。

## 三种用法

| 用法 | 传什么 | 歌词从哪来 | 支持人声分离 |
|---|---|---|---|
| **外部歌曲 · 公网地址** | `audio_url` + 歌词 | 你自己提供 | ❌ 不支持 |
| **外部歌曲 · 本地文件直传**（2026-10 新增） | `audio_object_key` + 歌词 | 你自己提供 | ❌ 不支持 |
| **平台歌曲**（本站生成的歌） | `song_id` | 我们从歌曲记录里取 | ✅ 可选 |

**参数的关系（最容易搞错，务必看清）**

- 传 `song_id` → 走平台歌曲：**不要再传** `lyrics` / `audio_url` / `audio_object_key`；
- 传 `audio_url` **或** `audio_object_key` → 走外部歌曲：两者**只能传一个**，且**不要再传** `song_id`；
- `vocal_separate` **只对平台歌曲有效**，外部歌曲传了会被拒绝（音频不在我们这边，无法分离）。

### 新增：本地文件直传（音频不经过我们的服务器）

音频在你本机、又不想先传到自己的公网存储时用这个。两步：

1. `POST /api/music/lyrics-align/upload-ticket`，带 `file_name` / `file_size` / `content_type`，
   拿到 `put_url`（**签名 URL，不含任何长期凭证**）与 `object_key`；
2. 把文件 `PUT` 到 `put_url`，**必须原样带上响应里的 `content_type`**（它参与签名，改一个字就是 403）；
3. 提交对齐时传 `audio_object_key` 而不是 `audio_url`。

凭据是一次性的：对齐跑完（成功或失败）服务端会删掉这个对象，同一个 key 再用会报错。

### 新增：歌词可以不传了

原来外部歌曲必须给歌词。现在**不传也能用**——服务端先做一次识别，用识别出来的文字当歌词。

**代价必须说清楚**：文字以**识别结果为准**，个别字可能不准。这类响应会明确标注
`lyrics_source: "asr"`、`confidence: "low"`，并在 `warnings[]` 里给
`{"code":"no_reference_lyrics"}`。

**要做逐字高亮 / KTV，请务必提供歌词原文。**

## 请求参数

### Headers

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| song_id | string | 二选一 | - | 平台歌曲 ID（平台歌曲用法） |
| lyrics | string | **否** | - | 歌词原文，`\n` 分行。**现在可以不传**，见上文「歌词可以不传了」 |
| audio_url | string | 外部歌曲二选一 | - | 音频地址，必须**公网可下载** |
| audio_object_key | string | 外部歌曲二选一 | - | 直传对象的 key（先调 `/lyrics-align/upload-ticket`） |
| vocal_separate | boolean | 否 | `false` | 是否先做人声分离（**仅平台歌曲**） |
| language | string | 否 | 自动判断 | `Chinese` / `English` 等；不传按歌词内容猜 |
| granularity | string | 否 | `both` | `both` / `line`（不返回逐字）/ `word` |
| sections | string | 否 | `keep` | `keep` 保留 `[Chorus]` 等段落标记（不参与时间轴）/ `drop` |
| format | string | 否 | `json` | `json` / `lrc` / `lrc-word`（后两者多返回 `lrc`、`lrc_word` 文本） |

### 限制

| 项 | 限制 |
|---|---|
| 音频时长 | **≤ 6 分钟**（超过返回错误并**全额退款**） |
| 音频来源 | 必须**公网可下载**，不接受需要登录态的地址 |
| 歌词格式 | 纯文本、`\n` 分行；`[Verse]`、`【主歌】` 等段落标记会原样保留，但不参与时间轴 |
| 批量 | 一次一首；多首请自行循环调用 |
| 结果保存 | 本接口**不落库**，请自行保存返回结果 |

## 请求示例

### 外部歌曲（歌词 + 音频地址）

```bash
curl -X POST https://www.suno-api.io/api/music/lyrics-align \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lyrics": "漫步在清冷的街头\n夜风轻抚过眼眸\n岁月匆匆如水流",
    "audio_url": "https://your-bucket.example.com/song.mp3"
  }'
```

### 平台歌曲（不分离）

```bash
curl -X POST https://www.suno-api.io/api/music/lyrics-align \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "17e52af7-b5df-4877-a98a-dce94e0e6aa2"}'
```

### 平台歌曲 + 人声分离（做卡拉OK推荐这个）

```bash
curl -X POST https://www.suno-api.io/api/music/lyrics-align \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "17e52af7-b5df-4877-a98a-dce94e0e6aa2", "vocal_separate": true}'
```

## 响应结果

### 成功响应

```json
{
  "success": true,
  "lyrics_source": "platform",
  "vocal_separate": false,
  "coverage": 0.935,
  "exact": 196,
  "fuzzy": 4,
  "total": 214,
  "lines": [
    {
      "text": "漫步在清冷的街头",
      "start": 21.66,
      "end": 24.06,
      "chars": [
        {"char": "漫", "start": 21.66, "end": 21.74, "word": true},
        {"char": "步", "start": 21.98, "end": 22.22, "word": true}
      ]
    }
  ]
}
```

### 字段说明

| 字段名 | 类型 | 说明 |
|---|---|---|
| `success` | boolean | 请求是否成功 |
| `lyrics_source` | string | `platform` = 歌词取自平台歌曲；`user` = 歌词由你提供；**`asr` = 你没给歌词，文字来自识别** |
| `vocal_separate` | boolean | 本次是否走人声分离 |
| `confidence` | string | `high` / **`low`**（`lyrics_source=asr` 时一定是 `low`） |
| `warnings[]` | array | 降级提示；无歌词时含 `{"code":"no_reference_lyrics"}` |
| `coverage` | number | **对齐质量**：有明确时间锚点的字占比（0–1） |
| `exact` / `fuzzy` / `total` | number | 精确命中字数 / 同音命中字数 / 歌词有效字数 |
| `lines[].text` | string | 一行歌词，**逐字符等于你的原文** |
| `lines[].start` / `end` | number | 这一行的起止时间（秒） |
| `lines[].section` | boolean | 这行是段落标记（`true` 时没有时间，不参与高亮） |
| `lines[].chars[]` | array | 逐字时间：`char` 字、`start`/`end` 秒、`word` 是否计入时间轴（标点为 `false`） |
| `words[]` | array | 扁平逐字列表：`text` / `start` / `end` / `line`；`granularity=line` 时不返回 |
| `lrc` | string | 逐行 LRC 文本（`format=lrc` 或 `lrc-word` 时才有） |
| `lrc_word` | string | 增强逐字 LRC，行内 `<mm:ss.xx>` 标签（`format=lrc-word` 时才有） |

### `coverage` 怎么用（三档建议）

| coverage | 建议用法 |
|---|---|
| **≥ 0.9** | 可以做逐字高亮（卡拉OK） |
| **0.8 – 0.9** | 逐字 + 整行混用，或只做整行高亮，逐字仅作参考 |
| **< 0.8** | 建议只做**整行高亮**（重唱、和声重、方言、说唱容易偏低） |

## 两个只读接口（不扣费）

校准结果会**按歌库存一份**（只存平台歌曲；外部歌没有稳定的 `song_id`，不落库）。
刷新页面 / 换设备时用这两个接口恢复，**不需要重算、不产生费用**。

| 方法 | 路径 | 作用 |
|---|---|---|
| `GET` | `/api/music/lyrics-align/result` | 读回上一次成功的校准结果 |
| `GET` | `/api/music/lyrics-align/stem-status` | 查这首歌**现在**能不能拿到人声轨 |

```
GET /api/music/lyrics-align/result?song_id=<song_id>&vocal_separate=false
→ { success:true, found:true, saved_at, lyrics_hash, lyrics_hash_match,
    result:{ …与当时 POST 返回的响应体一字不差… } }
→ { success:true, found:false }        // 还没算过

GET /api/music/lyrics-align/stem-status?song_id=<song_id>
→ { success:true, song_id, has_stem, vocal_stem_ready }
```

- `lyrics_hash_match=false`：歌曲的歌词改过了，这份结果是按旧歌词算的，建议重算；
  歌里本来就没有歌词时该字段为 `null`。
- `vocal_separate` 要与提交时一致（两种模式各存一份）。
- **`has_stem` 只表示"发起过分轨"**，不代表那条轨现在还能取到（分轨地址约 30 分钟失效）。
  做 UI 提示请只信 `vocal_stem_ready`；它要真探一次，所以只按单首查，别放进列表批量调。

## 状态与耗时

| 场景 | 实测耗时 |
|---|---|
| 平台歌曲 · 不分离 | 约 4.5 秒 |
| 平台歌曲 · 分离（已有人声轨） | 约 11 秒 |
| 平台歌曲 · 分离（需现场分离） | 约 25 秒，最长约 1 分钟 |
| 外部歌曲 · 歌词 + 音频地址 | 约 5–15 秒（视音频长度） |

> 服务端单次执行上限 8 分钟；**建议客户端超时设置为 120 秒以上**。

## 错误响应

```json
{
  "success": false,
  "message": "音频超过 6 分钟上限（实际 7.2 分钟）"
}
```

| 场景 | 是否扣费 |
|---|---|
| 缺少音频（三个都不传） | 不扣费（未开始处理） |
| `audio_url` 与 `audio_object_key` 同时传 | 不扣费（未开始处理） |
| 直传对象还没落盘 / 已被删除 | 不扣费（未开始处理） |
| 非法的 `granularity` / `sections` / `format` | 不扣费（未开始处理） |
| 平台歌曲不存在 / 不属于当前账号 | 不扣费（未开始处理） |
| 参数缺失或参数不合法 | 不扣费（未开始处理） |
| 音频超过 6 分钟上限 | **全额退款** |
| 音频不可下载（非公网地址 / 需要登录） | **全额退款** |
| 不传歌词、但服务端识别失败 | **全额退款** |
| 勾了人声分离但没有可用人声轨 | **全额退款**（含人声分离费用） |
| 对齐服务异常或超时 | **全额退款** |

**原则：拿不到最终结果就全额退款。** 只有真正返回了逐字时间戳才扣费，退款自动完成、无需申请。

## 计费

| 项目 | 何时收 | 说明 |
|---|---|---|
| 歌词时间戳校准（基准） | 每次都收 | 按次计费（当前默认 0.1 元/次），实际扣费以当前后台价格配置为准 |
| **转写附加费** | **只有不提供歌词时**加收 | 服务端要先跑一次语音识别，那是"有歌词"档没有的成本，所以单独计价 |
| 人声分离（可选，仅平台歌曲） | 勾了 `vocal_separate` 时 | 按平台「人声/伴奏分离」的现有价格计一次，与本接口一起结算 |

组合关系：

```
实付 = 基准价 + （不提供歌词 ? 转写附加费 : 0） + （勾了分轨 ? 分轨价 : 0）
```

**人声分离费用只收一次**：如果你已经做过分离、能直接拿到人声轨，就由本接口收；如果需要现场分离，则由分离那一步收。

## 完整示例（Python）

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE = "https://www.suno-api.io"

def align_lyrics(song_id=None, lyrics=None, audio_url=None, vocal_separate=False):
    payload = {}
    if song_id:
        payload["song_id"] = song_id
        payload["vocal_separate"] = vocal_separate
    else:
        payload["lyrics"] = lyrics
        payload["audio_url"] = audio_url

    r = requests.post(
        f"{BASE}/api/music/lyrics-align",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json=payload,
        timeout=600,
    )
    data = r.json()
    if not data.get("success"):
        raise RuntimeError(data.get("message"))
    return data


res = align_lyrics(song_id="17e52af7-b5df-4877-a98a-dce94e0e6aa2", vocal_separate=True)
print("对齐质量 coverage =", res["coverage"])
for line in res["lines"]:
    print(f'{line["start"]:7.2f}  {line["text"]}')
    # 逐字卡拉OK：line["chars"] 里每个字都有自己的 start / end
```

## 常见问题

**Q：返回的是逐字还是逐行？**
A：两者都有。`lines[].start` 是逐行，`lines[].chars[].start` / `end` 是逐字，播放器按需取用。

**Q：为什么返回的文字和我传的一模一样？**
A：设计如此。我们不做识别改写，只做时间对齐，所以歌词永远不会被"改错字"。

**Q：`coverage` 很高，但听起来还是有点偏？**
A：逐字对齐误差通常在几十毫秒量级；如果整首歌都偏一个固定值，多半是音频开头有一段静音，可以裁剪后再试。

**Q：为什么刚刚做了人声分离能用，过一会儿就报"人声轨不可用"？**
A：分离结果是**短时效的临时地址**（实测约半小时后失效）。这种情况接口会尝试自动重新分离；如果最终仍然失败，会**全额退款**。所以"先分离、过一会儿再做校准"这种用法不可靠，建议在同一个流程里连着做。

**Q：平台歌曲需要我自己先做分离吗？**
A：不需要。勾 `vocal_separate: true` 后我们会检查这首歌是否已有人声轨；没有可用人声轨会报错并退款，不会用原曲糊弄。

**Q：可以批量吗？**
A：一次请求一首。批量请循环调用；每次调用都会正常计费，建议本地缓存结果。

**Q：结果会被保存吗？**
A：本接口不落库，请自行保存返回值（逐行 + 逐字时间戳都在响应里）。
