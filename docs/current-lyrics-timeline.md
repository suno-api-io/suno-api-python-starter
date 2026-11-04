# 时间轴歌词 API

## 接口说明

时间轴歌词用于获取歌曲逐词级别的时间戳，可用于歌词同步显示。

**接口地址**: `POST /api/lyrics/timeline`

**计费**: 免费（只读查询，不扣费、不产生生成任务）。

**返回格式**: 直接返回时间轴数组，**没有 `data` / `success` 外层包装**，解析后就是一个数组。

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
| song_id | string | 是 | - | 歌曲 ID |

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/lyrics/timeline \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "suno-v6",
    "song_id": "clip_id"
  }'
```

## 响应结果

下面是生产环境一首 189.6 秒、`suno-v6` 歌曲的真实返回（该次共 69 段，这里只保留首尾几段）：

```json
[
  {
    "word": "[Intro]\n\n\n[",
    "start_s": 15,
    "end_s": 15.04277,
    "success": true,
    "p_align": 0.99
  },
  {
    "word": "Instrumental: ",
    "start_s": 15.04704,
    "end_s": 15.10264,
    "success": true,
    "p_align": 0.99
  },
  {
    "word": "End]\n\n\n",
    "start_s": 189.16974,
    "end_s": 189.654,
    "success": true,
    "p_align": 0.99
  }
]
```

## 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `word` | string | 该片段对应的文本，**自带换行**：一行歌词一段、段尾带 `\n`，段落之间是 `\n\n`，因此会出现只含空白的内容 |
| `start_s` | number | 片段开始时间，单位秒（带小数） |
| `end_s` | number | 片段结束时间，单位秒。最后一段的 `end_s` 基本等于歌曲时长 |
| `success` | boolean | 该片段是否对齐成功 |
| `p_align` | number | 对齐置信度，实测稳定在 `0.99` |

## 使用注意

1. **不要找外层包装**。返回就是数组本身，不是 `{"data": ...}`，也没有 `success` 字段。
2. **开头可能没有片段**。纯前奏的歌曲实测从第 15 秒才出现第一个片段，`start_s` 不保证从 `0` 开始；做卡拉 OK 时请自己处理开头的空档。
3. **器乐与结构标记也会返回**，形如 `[Intro]`、`[Verse 1]`、`Instrumental: soft arpeggiating piano, …`、`[End]`，并且同样逐词给出时间。做歌词字幕前建议按 `[` 开头或 `Instrumental` 过滤掉这些片段，否则会把编曲描述当成歌词显示。
4. **是逐词而不是逐行**。同一句歌词常被拆成多个片段，需要按 `\n` 合并成行；一行的时间取该行第一个片段的 `start_s`。
5. **段数与歌曲有关**，不要假设固定段数（实测 189.6 秒的歌为 69 段，响应体约 6.5 KB）。

## 生成 .lrc 文件

本接口只返回时间轴数据，不直接返回文件。需要 `.lrc` 时，用返回的 `start_s` 按
`[mm:ss.cc]` 格式拼行即可（`word` 字段自带换行，按行拆开，空行跳过）。示例见
[歌曲媒体下载与试听 API](current-music-media-download.md) 的「时间轴歌词（.lrc）怎么取」。

下面是带器乐/结构标记过滤的完整写法（一段一行，适合先验证数据形态）：

```python
import re

SKIP = re.compile(r"^\[.*\]$|^Instrumental:")

def to_lrc(segments):
    lines = []
    for seg in segments:
        if not seg.get("success", True):
            continue
        text = (seg.get("word") or "").strip()
        if not text or SKIP.match(text):
            continue
        cs = int(max(0.0, float(seg["start_s"])) * 100 + 0.5)
        lines.append(f"[{cs // 6000:02d}:{(cs % 6000) // 100:02d}.{cs % 100:02d}]{text}")
    return "\n".join(lines)
```

## 兼容说明

旧版文档中曾使用 `{ success, song_id, lyrics: [...] }` 包装对象示例。当前新版文档以直接返回时间轴数组为准。
