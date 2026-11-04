# Suno-API Python Starter

一个用于演示 AI 音乐生成任务状态机的最小 Python 示例。

Suno-API 是独立第三方 AI 音乐平台和开发者 API，接入 Suno V6 系列音乐生成能力，与 Suno 官方无隶属关系。

**Website:** https://www.suno-api.io/  
**Create music:** https://www.suno-api.io/create/  
**API documentation:** https://www.suno-api.io/docs/

> **Why this repository exists:** most AI music API incidents are not model
> failures. They come from mixing request IDs, task status, media URLs, and
> retries. This starter demonstrates a safer contract with explicit states,
> idempotency, bounded polling, and delivery checks.

## 这个示例解决什么

很多接入问题不是“请求没发出去”，而是业务代码把几个 ID 和状态混在一起：

- `Idempotency-Key`：防重复受理；
- `request_id`：异步受理号；
- `song_id`：真实歌曲 ID；
- `pending / processing / completed / failed`：任务状态；
- 媒体 URL：短期地址，需要转存或在过期后刷新。

示例优先使用异步受理，避免客户端挂 300 秒长连接。

## 前置条件

- Python 3.10+
- 一个 Suno-API Key
- 服务端可以访问 `https://www.suno-api.io`

## 安装

```bash
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

macOS / Linux:

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
```

## 配置

不要把 Key 写进代码或提交到 Git。

PowerShell:

```powershell
$env:SUNO_API_KEY = "YOUR_API_KEY"
```

macOS / Linux:

```bash
export SUNO_API_KEY="YOUR_API_KEY"
```

## 运行

```bash
python sample.py "一首适合短视频开场的明亮电子音乐"
```

成功后，示例会输出受理号、每首歌曲的 `song_id`、最终状态和媒体地址。

## 请求流程

```text
POST /api/music/create
  accept_mode=async
  Idempotency-Key=<uuid>
        ↓
202 + request_id
        ↓
GET /api/music/requests/{request_id}
        ↓
tasks[].song_id
        ↓
POST /api/music/query
        ↓
MP3 / WAV / video / cover
```

## 关键规则

1. 网络重试必须复用同一个 `Idempotency-Key`。
2. 不要立即重试超时。同步接口超时后先通过 `GET /api/music/songs` 查历史。
3. 只对 429 和 5xx 自动等待；400、401、402、403 不做自动重试。
4. `request_id` 不能当 `song_id` 使用。
5. 两首结果分别保存、分别处理。
6. 媒体地址默认 7 天有效，生产系统应在到期前转存。
7. URL 过期后重新查询即可，不要重新生成歌曲。

## 公开文档

- 快速开始：https://www.suno-api.io/docs/quick-start/
- API 总览：https://www.suno-api.io/docs/current-overview/
- 灵感模式生成：https://www.suno-api.io/docs/current-music-create/
- 歌曲查询：https://www.suno-api.io/docs/current-music-query/
- 媒体下载：https://www.suno-api.io/docs/current-music-media-download/

## What to inspect first

- `sample.py`: acceptance, polling, retry classification, and media lookup;
- `SECURITY.md`: rules for reporting integration problems without leaking keys;
- `.github/workflows/ci.yml`: syntax and CLI smoke checks;
- the public API documentation linked above.

## Contributing

Small corrections and reproducible integration fixes are welcome. Remove all
API keys, cookies, user data, and private media URLs before opening an issue or
pull request. Product-specific support requests should use the support entry
listed on the service website.

## 许可证

示例代码使用 MIT License。API 服务的使用条款、计费和内容授权以 Suno-API 官网实时说明为准。

