# Free2 下载 API

## 接口说明

Free2 是独立的付费下载通道：按歌曲 ID（或 suno.com 歌曲链接）解析出 MP3/WAV/歌词/元数据
文件，返回平台托管的下载地址。它只接受 API Key，**不接受浏览器登录态**，返回值里也不包含
Suno 的加密播放源。

**接口地址**：`POST /api/music/free2`

**计费**：按**成功首数**计费，当前默认 **0.2 元/首**。一次请求里选几个文件类型都不额外加价；
解析失败的首数不收费。单次最多 10 首（去重后），实际扣费以后台价格配置为准。

**推荐模型**：`suno-v6`。可用 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini`。

## 认证

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | `Bearer YOUR_API_KEY` |
| Content-Type | string | 是 | `application/json` |

## 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| song_id | string | 否 | - | 单首歌 ID，也可以是 suno.com 歌曲链接（含 `/s/` 短链） |
| song_ids | string[] | 否 | - | 多首写法（推荐），单次最多 10 首 |
| songs | string[] | 否 | - | `song_ids` 的别名 |
| files | string[] | 是 | - | 需要的文件类型，可选 `mp3`、`wav`、`lyrics`、`metadata`；`m4a` 不支持 |

`song_id` 与 `song_ids` 至少提供一个；`files` 至少一个。

## 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/free2 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_ids": ["song_id_1", "song_id_2"],
    "files": ["mp3", "wav", "lyrics"]
  }'
```

## 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "songs": [
      {
        "song_id": "song_id_1",
        "files": [
          {"type": "mp3", "url": "https://media.suno-api.io/assets/song_id_1-free2-v1-mp3.mp3"}
        ]
      },
      {
        "song_id": "song_id_2",
        "files": [],
        "error": {"code": "song_not_found", "message": "song not found or not owned by the current user"}
      }
    ],
    "requested_songs": 2,
    "succeeded_songs": 1,
    "price": 0.2
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| songs | array | 每首歌的处理结果：`song_id`、`files[]`、失败时带 `error` |
| requested_songs | number | 归一化去重后的歌曲数 |
| succeeded_songs | number | 成功数量，计费按这个数字 |
| price | number | 本次实际扣费（元） |

只请求一首歌时，响应里还会额外返回顶层 `song_id` 与 `files`，兼容旧版单首写法。

## 复用缓存地址（不计费）

已经下载过的歌，再次下载不必重新解析、也不再扣费：用 `POST /api/music/free2/cached`
取回该账号此前下载过的那批文件的当前地址。

**接口地址**：`POST /api/music/free2/cached`

**计费**：**免费**。只读缓存，不解析、不转码、不扣费；只返回已经准备好且未被回收的地址。

> **⚠️ 下载地址有效期：7 天，请及时转存**。`songs[].files[].url` 由平台对象存储提供，默认 7 天后失效（文件到期回收，旧地址返回 404）；请在这 7 天内转存到你自己的存储。地址过期后，重新调用 `POST /api/music/free2` 重新准备即可拿到新的有效地址（该次重新准备按正常计费规则收费；`/api/music/free2/cached` 只返回仍然有效的缓存地址）。

**请求参数**：与 `POST /api/music/free2` 完全相同（`song_id` / `song_ids` / `songs` 任一，`files` 至少一个）。

```bash
curl -X POST https://www.suno-api.io/api/music/free2/cached \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "song_ids": ["98ca3f1d-…", "a185b3d9-…"], "files": ["mp3"] }'
```

```json
{
  "success": true,
  "data": {
    "items": [
      { "song_id": "98ca3f1d-…", "type": "mp3", "url": "https://…/assets/98ca3f1d-…-free2-v1-mp3.mp3" }
    ],
    "songs": [
      { "song_id": "98ca3f1d-…", "files": [ { "type": "mp3", "url": "https://…" } ], "missing_files": [] },
      { "song_id": "a185b3d9-…", "files": [], "missing_files": ["mp3"] }
    ],
    "missing": ["a185b3d9-…"]
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| items | array | 可直接下载的地址清单（`song_id` + `type` + `url`） |
| songs | array | 按歌曲分组的结果，`missing_files` 是这次没命中缓存的格式 |
| missing | string[] | 这首歌一个可用缓存都没有（需要改用 `POST /api/music/free2` 重新解析，那一步按首计费） |

只有你此前**下载过**的歌曲才会返回地址；没有下载记录、或资产已被回收的歌曲一律只出现在
`missing` 里，不会返回任何地址。

## 注意事项

- `POST /api/music/free2` 可以解析 Suno 上任意公开歌曲（含不在本平台的歌），歌曲无法解析时会在该首上返回 `error`，不影响同批次其它歌曲。而 `POST /api/music/free2/cached` 只对本账号下载过的歌返回地址。
- 同一首歌首次解析会生成托管文件，之后复用；`files` 里不要传重复类型，服务端会自动去重。
- 与[歌曲媒体下载与试听 API](current-music-media-download.md) 的区别：Free2 是付费、
  支持直接传 suno.com 链接、并且不提供歌词之外的时间轴/MIDI 等类型。
