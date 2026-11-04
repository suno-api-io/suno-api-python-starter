# 歌曲媒体下载与试听 API

## 接口说明

这一组接口把「拿媒体地址」和「真正下载文件」分开：

- 想拿一个可以直接播放/下载的地址（例如放进自己的播放器或转存到对象存储）：用
  `POST /api/music/download-url`，或响应里已经给出的 `GET /api/music/download`。
- 想让浏览器直接落盘保存文件：用 `POST /api/music/download-file`（单文件）或
  `POST /api/music/download-all`（打包）。
- 歌曲还在生成中、想先试听：用 `POST /api/music/generation-stream-url`。

**计费**：全部免费。下载与试听只读取平台已托管的媒体，不调用 Suno，不扣费。

**推荐模型**：`suno-v6`。可用 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`。

## 认证

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY`（`GET /api/music/download` 同时接受登录态） |
| Content-Type | string | 是 | `application/json` |

## 支持的媒体类型（`kind`）

| kind | 说明 |
|---|---|
| `song` | 音频（`mp3` 是它的别名，默认值；响应里统一回写为 `song`） |
| `wav` | WAV 文件，需要先调用[WAV 生成/获取 API](current-music-wav.md) 准备好 |
| `video` | 视频（`mp4` 是别名） |
| `midi` | 分轨的 MIDI，仅对已完成的分轨轨道有效，见[MIDI 获取 API](current-music-midi.md) |
| `cover` | 封面图（`image` 是别名） |
| `lyrics` | 歌词文本（`.txt`），只能用 `download-file` / `GET /api/music/download` 取，`download-url` 不返回歌词地址 |
| `timestamped_lyrics` | 时间轴歌词文件（`.lrc`，别名 `lrc`）。**目前仅部分歌曲支持**；返回 `success:false` 时请改用[时间轴歌词 API](current-lyrics-timeline.md) 取时间轴后自行生成 |

## 1）获取媒体地址

```bash
curl -X POST https://www.suno-api.io/api/music/download-url \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "song_id", "kind": "song"}'
```

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "song_id": "song_id",
    "kind": "song",
    "url": "https://media.suno-api.io/assets/song_id-mp3.mp3",
    "nav_url": "https://media.suno-api.io/assets/song_id-mp3.mp3?...&response-content-disposition=attachment..."
  }
}
```

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| song_id | string | 是 | 自己的歌曲 ID |
| kind | string | 否 | 见上表，默认 `song` |
| refresh | boolean | 否 | 传 `true` 会强制重新准备资源（例如 CDN 上文件被回收后重新生成） |

`url` 用于播放或自行转存；`nav_url` 带 `Content-Disposition: attachment`，
适合直接赋给浏览器地址栏下载（部分国内手机浏览器不支持 blob 下载时使用）。

> **⚠️ 地址有效期：7 天，请及时转存**
>
> `url` / `nav_url` 指向平台的对象存储，**默认在 7 天后失效**（文件到期回收，旧地址会返回 404）。请在这 7 天内把文件转存到自己的存储。
>
> 过期后**不必重新生成歌曲**：重新调用 `POST /api/music/download-url`（或把 `refresh` 传 `true`）即可拿到该歌曲**新的有效地址**，本组接口本身免费、不额外计费。

## 2）直接下载单文件

```bash
curl -X POST https://www.suno-api.io/api/music/download-file \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"song_id": "song_id", "kind": "song"}' \
  -o song.mp3
```

响应体是文件流（不是 JSON），`Content-Disposition` 已经带好文件名。
歌词与时间轴歌词只能用这个接口取（`download-url` 只返回媒体地址，不返回歌词）。
其中 `.lrc` 文件目前仅部分歌曲支持；若返回 `success:false`，请按下一节用
[时间轴歌词 API](current-lyrics-timeline.md) 自行生成 `.lrc`，不要重试。

## 时间轴歌词（.lrc）怎么取

推荐用两步，任何歌曲都适用：

**第一步：取逐词时间轴（免费）**

```bash
curl -X POST https://www.suno-api.io/api/lyrics/timeline \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "suno-v6", "song_id": "song_id"}'
```

返回**直接就是数组**（没有 `data` 外层包装），每个元素形如
`{"word": "…", "start_s": 1.117, "end_s": 8.138, "success": true, "p_align": 0.99}`。
`word` 里已经带换行，可按行拆开；字段含义、器乐段过滤等注意点见
[时间轴歌词 API](current-lyrics-timeline.md) 的「字段说明」「使用注意」。

**第二步：用 `start_s` 自行拼 `.lrc`（时间格式 `[mm:ss.cc]`）**

```python
def to_lrc(segments):
    lines = []
    for seg in segments:
        text = seg["word"].strip()
        if not text:
            continue
        start = max(0.0, float(seg["start_s"]))
        cs = int(start * 100 + 0.5)
        lines.append(f"[{cs // 6000:02d}:{(cs % 6000) // 100:02d}.{cs % 100:02d}]{text}")
    return "\n".join(lines)
```

`GET /api/music/download?song_id=<id>&kind=lrc` 也可以直接下载服务端生成的 `.lrc`，
但**目前仅部分歌曲支持**：如果返回 `success:false`，请改用上面这种方式自行生成，
不需要重试、也不影响计费。

## 3）打包下载

```bash
curl -X POST https://www.suno-api.io/api/music/download-all \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"song_ids": ["song_id_1", "song_id_2"]}' \
  -o songs.zip
```

`song_id`（单个）与 `song_ids`（批量，最多 50 条）二选一。响应体是 ZIP 文件流。

## 4）稳定下载地址

`GET /api/music/download?song_id=<id>&kind=<kind>` 是歌曲响应里直接给出的下载入口，
鉴权同时支持 API Key 与登录态，行为等价于 `download-file`，适合写死进客户端或第三方播放器。

## 5）生成中试听

```bash
curl -X POST https://www.suno-api.io/api/music/generation-stream-url \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"song_ids": ["song_id_1", "song_id_2"]}'
```

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "song_id": "song_id_1",
        "url": "https://media.suno-api.io/assets/song_id_1-mp3.mp3",
        "expires_at": 0,
        "content_type": "audio/mpeg",
        "playable_until_completed": false,
        "mode": "mp3",
        "ranges": true
      }
    ]
  }
}
```

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| song_id | string | 否 | 单个歌曲 ID |
| song_ids | string[] | 否 | 批量，最多 24 条（一批自动分轨的轨道数上限） |

`playable_until_completed` 为 `true` 表示这是生成中的临时试听地址，歌曲完成后请改用正式地址；
单首失败时该项会带 `error` 字段，其余歌曲照常返回。

## 注意事项

- 所有接口都只返回**平台托管**的媒体地址，不会返回 Suno 平台的加密源或临时签名地址。
- 地址不是永久有效的，长期保存请自行转存；需要原文件落盘时用 `download-file`。
- 分轨轨道的 MIDI 需要该轨道已完成分离，否则返回错误。
