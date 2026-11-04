# Suno-API 接口文档

> 本目录同步自 Suno-API 官网公开接口文档，便于开发者在 GitHub 上阅读、检索和引用。
> 最近同步：2026-11-04。在线版本：https://www.suno-api.io/docs/
> 接口行为、模型状态和价格以官网实时页面为准；示例中的 API Key 统一使用 `YOUR_API_KEY` 占位。

欢迎使用 Suno API 接口文档。本站使用 Suno 官方模型提供 AI 音乐生成与歌曲创作 HTTP API，帮助开发者快速接入灵感创作、专业模式、歌词生成、AI 翻唱、人声克隆、续写、伴奏分离和 WAV 音频处理能力。

如果你正在寻找 Suno V6 API、AI 音乐生成 API、在线生成歌曲接口或 Suno 人声克隆 API，可从[快速开始指南](./quick-start.md)开始。所有公开模型和请求示例以[支持的模型](./models.md)为准。

> 模型提示：普通歌曲生成当前使用 Suno V6 系列，对客模型名为 `suno-v6`、`suno-v6-wild` 和 `suno-v6-mini`。`suno-v2`、`suno-v3`、`suno-v3-5`、`suno-v4`、`suno-v4-5`、`suno-v4-5-all`、`suno-v4-5-plus`、`suno-v5`、`suno-v5-5` 已下线，不再接受新建请求；历史任务仍可能返回这些名称。详见[支持的模型](./models.md)。

## 📚 文档导航

- [快速开始指南](./quick-start.md) - 5分钟快速上手
- [认证说明](./authentication.md) - API 密钥获取与使用
- [支持的模型](./models.md) - 模型版本说明

### 新版接口文档（推荐）
- [新版 API 总览](./current-overview.md) - 当前推荐接入能力总览
- [账户余额查询 API](./current-user-balance.md) - 查询账户余额，不扣费
- [灵感模式生成 API](./current-music-create.md) - AI 自动创作音乐
- [专业模式生成 API](./current-music-create-custom.md) - 指定歌词和风格创作
- [音效生成 API](./current-music-sounds.md) - 生成几秒钟的音效：单次与循环，最长约 20 秒
- [歌词生成 API](./current-lyrics-generate.md) - AI 生成歌词
- [人声克隆与指定人声生成 API（不推荐）](./current-voice-clone.md) - 旧链路；新接入请用【推荐】克隆音色 API
- [【推荐】克隆音色 API](./current-clone-voice.md) - 用一段人声样本创建音色，再用它翻唱指定歌曲或演唱新歌
- [风格增强 API](./current-music-boost-style.md) - 扩写风格标签
- [灵感提示词 API](./current-prompts-suggestions.md) - 获取随机灵感
- [上传源音频 API](./current-music-upload-source.md) - 上传后续创作素材
- [强化上传 API](./current-music-enhanced-upload.md) - 上传音频并生成增强结果
- [上传后翻唱 API](./current-music-upload-cover.md) - 上传音频并翻唱
- [基于源 clip 翻唱 API](./current-music-generate-from-source.md) - 复用已有源 clip 翻唱
- [续写 API](./current-music-extend.md) - 延长现有音乐
- [替换段落 API](./current-music-replace-section.md) - 局部替换歌曲片段
- [增加伴奏 API](./current-music-add-instrumental.md) - 为已有歌曲重新编曲或增加伴奏
- [增加人声 API](./current-music-add-vocal.md) - 为已有歌曲增加或重写人声
- [加轨 API](./current-music-add-stem.md) - 为已有歌曲增加指定乐器或音轨
- [融合 API](./current-music-mashup.md) - 融合两首来源歌曲
- [采样 API](./current-music-sample.md) - 从已有歌曲截取采样并生成新歌
- [灵感 API](./current-music-inspo.md) - 用一首或多首歌曲作为灵感来源
- [裁剪 API](./current-music-crop.md) - 保留已有歌曲的指定时间段
- [删减 API](./current-music-remove-section.md) - 删除已有歌曲中的指定时间段
- [淡入/淡出 API](./current-music-fade.md) - 为已有歌曲增加渐强或渐弱效果
- [倒放 API](./current-music-reverse.md) - 将已有歌曲倒放
- [变速 API](./current-music-speed.md) - 调整已有歌曲速度并可选保持音高
- [分轨（人声伴奏分离）API](./current-music-separate.md) - 分离人声和伴奏
- [人声去除 API](./current-music-vocal-removal.md) - 一键拆出人声与伴奏（两轨，免费）
- [分轨删除 API](./current-music-stem-delete.md) - 隐藏不再需要的分轨（软删除，免费）
- [WAV 生成/获取 API](./current-music-wav.md) - 获取 WAV 音频
- [MIDI 获取 API](./current-music-midi.md) - 获取分轨轨道的 MIDI 文件
- [歌曲媒体下载与试听 API](./current-music-media-download.md) - 媒体地址、单文件/打包下载、生成中试听
- [Free2 下载 API](./current-music-free2.md) - 按首计费的下载通道，支持 suno.com 链接
- [歌曲查询与历史 API](./current-music-query.md) - 查询生成状态、账号歌曲历史和生成参数
- [时间轴歌词 API](./current-lyrics-timeline.md) - 获取歌词时间轴
- [音乐商用授权书 API](./current-music-authorization.md) - 查询可授权歌曲、生成和下载 PDF 授权书

## 🚀 快速开始

### 1. 获取 API 密钥

访问 [https://www.suno-api.io](https://www.suno-api.io) 注册账号并获取您的 API 密钥。

### 2. 发起第一个请求

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "一首轻快的流行歌曲，关于夏天的海边",
    "model": "suno-v6"
  }'
```

### 3. 查询生成结果

```bash
curl -X POST https://www.suno-api.io/api/music/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_ids": "your-song-id",
    "model": "suno-v6"
  }'
```

## 💰 计费说明

| 接口类型 | 价格 | 说明 |
|---------|------|------|
| 灵感生成 | ¥0.6/次 | 每次生成通常返回 2 首歌曲 |
| 自定义生成 | ¥0.6/次 | 每次生成通常返回 2 首歌曲 |
| 音色/声音生成 | ¥0.6/次 | 创建短采样、循环和单次音效 |
| 续写 | ¥0.6/次 | 延长现有音乐 |
| 替换段落 | ¥0.6/次 | 局部替换歌曲片段 |
| 增加伴奏 | ¥0.6/次 | 为已有歌曲重新编曲或增加伴奏 |
| 增加人声 | ¥0.6/次 | 为已有歌曲增加或重写人声 |
| 加轨 | ¥0.6/次 | 为已有歌曲增加指定乐器或音轨 |
| 融合 | ¥0.6/次 | 融合两首来源歌曲 |
| 采样 | ¥0.6/次 | 从已有歌曲截取采样并生成新歌 |
| 灵感 | ¥0.6/次 | 用一首或多首歌曲作为灵感来源 |
| 裁剪 / 删减 / 淡入淡出 / 倒放 / 变速 | ¥0.6/次 | Studio 编辑类动作，按请求模型计费 |
| 上传源音频 | 免费 | 只上传后续创作素材，不开始生成 |
| 上传后翻唱 | ¥0.6/次 | `cover` 表示翻唱，不是上传图片封面 |
| 基于源 clip 翻唱 | ¥0.6/次 | 使用已上传或已有源 clip 生成翻唱 |
| 分轨（人声伴奏分离） | 按模式计费 | `two` 默认 ¥0.6/次，`twelve` 默认 ¥3.0/次 |
| 人声去除 | 免费 | 两轨快捷分离，不产生生成费用 |
| 分轨删除 | 免费 | 软删除，只隐藏列表 |
| WAV 生成/获取 | 免费 | 生成或获取已有歌曲的 WAV 地址 |
| MIDI 获取 | 免费 | 取已完成分轨轨道的 MIDI |
| 媒体下载与生成中试听 | 免费 | `download` / `download-url` / `download-file` / `download-all` / `generation-stream-url` |
| Free2 下载 | ¥0.2/首 | 按成功首数计费，单次最多 10 首，支持 suno.com 链接 |
| 强化上传 | ¥10/次 | 失败或允许阶段取消会自动退款 |
| 人声克隆 | 手动二次验证免费；长期有效克隆 ¥5/次 | Create UI 长期克隆走内部 Suno API + MiniMax 自动验证 |
| 指定人声生成 | ¥1.2/次 | 使用已克隆人声生成歌曲；开启 Max Mode 为 ¥2.4/次 |
| 音乐商用授权书 | 免费 | 查询资格、绑定身份、生成与下载 PDF 授权书 |
| 歌词生成 | 免费额度内免费 | 每个用户每分钟最多10次，每天最多300次；超出后按 0.1 元/次收费 |
| 风格增强 | 免费额度内免费 | 每个用户每分钟最多10次，每天最多300次；超出后按 0.1 元/次收费 |
| Prompt/Style 资源列表 | 免费额度内免费 | 每个用户每分钟最多10次，每天最多300次；超出后按 0.1 元/次收费 |
| 灵感提示词 | 免费额度内免费 | 每个用户每分钟最多10次，每天最多300次；超出后按 0.1 元/次收费 |
| 查询接口 | 免费 | 查询音乐状态和结果 |
| 带时间戳歌词 | 免费 | 获取歌词时间轴，需要 `.lrc` 文件时用时间轴数据自行生成 |

**Max Mode 与 Variety**：生成类接口支持可选参数 `max_mode`（开启后该次按 2 倍价格计费）
与 `variety`（0-4 风格变化程度，不额外计费）。取值、支持范围与示例见
[新版 API 总览](./current-overview.md) 的「高级参数」一节。

## ⚡ 性能指标

- **平均生成时间**: ~60 秒
- **并发支持**: 支持多任务并发
- **音频格式**: MP3, 320kbps
- **视频格式**: MP4, 1080p
- **提交等待时间**: 多数请求 1–3 秒返回，约 10% 超过 30 秒，最长实测约 230 秒

> 生成类接口是同步接口，**响应返回时才代表订单已被受理并提交生成**。请把客户端超时设置为 **300 秒以上**；**未收到响应不等于没有生成**，超时后请勿立即重试（会重复下单、重复扣费）。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

## 🔧 技术支持

如有问题，请联系：
- 技术支持QQ群：926975276
- 在线文档: www.suno-api.io/docs


## 📝 更新日志

### 2026-04-22
- 初始版本发布
- 支持 Suno V6 系列模型
- 提供 8 个核心 API 接口

### 2026-09-10
- 普通歌曲生成模型更新为 `suno-v6`、`suno-v6-wild`、`suno-v6-mini`
- 标记 V2 至 V5.5 普通生成模型为已下线

### 2026-09-11
- 新增多个 Studio / Remix 编辑接口文档
- 更新文档索引，仅保留当前版本接口入口
