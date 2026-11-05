# 快速开始指南

本指南将帮助您在 5 分钟内完成 Suno-API 的接入。

> 当前普通歌曲生成默认模型为 `suno-v6`。`suno-v2` 至 `suno-v5-5` 普通生成模型已下线，仅可能出现在历史任务中，不能用于新请求。模型选项和分轨说明请参阅[支持的模型](./models.md)。

## Suno 模型 API 与 Key 获取

本站**使用 Suno 官方模型提供 HTTP API**。你无需自行申请 Suno 账号，在本站注册后即可创建 API Key，直接调用官方模型完成音乐生成；Key、计费和限流由本站统一管理。

拿到本站 Key 只要三步：

1. 用邮箱注册并登录（不需要手机号，也不用绑卡）。
2. 进入「控制台 → 令牌管理」，新建一个令牌。
3. 复制这个令牌，它就是请求头里的 `Authorization: Bearer YOUR_API_KEY`；令牌只完整显示一次。

## 第一步：获取 API 密钥

1. 访问 [https://www.suno-api.io](https://www.suno-api.io)
2. 点击中间的「获取密钥」按钮
3. 注册或登录您的账号
4. 在控制台-令牌管理中创建新的 API 密钥
5. 复制并妥善保管您的密钥（密钥只显示一次）
6. 在钱包管理中输入兑换码兑换额度（可前往闲鱼 winter宝宝 店铺购买兑换码）或点击该链接https://m.tb.cn/h.iHLa7gp?tk=rRy15RQvlpQ 直接前往购买
7. 充值：点账号菜单里的「充值」，支持**微信支付**、**兑换码**，也可以从官方闲鱼店购买充值码后回来兑换

## 第二步：配置 API 基础信息

所有 API 请求都需要以下基础配置：

**API 基址**: `https://www.suno-api.io`

**请求头**:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

## 第三步：发起第一个请求

### 示例 1：灵感生成（最简单）

只需提供一句话描述，AI 会自动创作完整的歌曲：

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "一首关于春天的轻快民谣",
    "model": "suno-v6"
  }'
```

**响应示例**:
```json
[
  {
    "song_id": "abc123",
    "status": "pending",
    "song_title": "春日物语",
    "description": "一首关于春天的轻快民谣",
    "created_at": "2026-04-22T10:30:00Z"
  },
  {
    "song_id": "def456",
    "status": "pending",
    "song_title": "春天的脚步",
    "description": "一首关于春天的轻快民谣",
    "created_at": "2026-04-22T10:30:00Z"
  }
]
```

> 💡 **提示**: 每次生成通常会返回 2 首不同风格的歌曲供您选择。

### 示例 2：查询生成进度

使用返回的 `song_id` 查询音乐生成状态：

```bash
curl -X POST https://www.suno-api.io/api/music/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_ids": ["abc123", "def456"],
    "model": "suno-v6"
  }'
```

**响应示例（生成中）**:
```json
[
  {
    "song_id": "abc123",
    "status": "processing",
    "song_title": "春日物语",
    "progress": "60%"
  }
]
```

**响应示例（生成完成）**:
```json
[
  {
    "song_id": "abc123",
    "status": "completed",
    "song_title": "春日物语",
    "audio_url": "https://cdn.suno-api.io/audio/abc123.mp3",
    "video_url": "https://cdn.suno-api.io/video/abc123.mp4",
    "cover_url": "https://cdn.suno-api.io/cover/abc123.jpg",
    "lyrics": "春风吹过田野...",
    "duration": 180.5,
    "model_version": "suno-v6",
    "created_at": "2026-04-22T10:30:00Z"
  }
]
```

## 第四步：下载音乐文件

生成完成后，使用返回的 `audio_url` 直接下载 MP3 文件：

```bash
curl -O https://cdn.suno-api.io/audio/abc123.mp3
```

或在浏览器中直接访问该 URL 进行播放。

> **⚠️ 音频地址 7 天后失效，请及时转存**：`audio_url`、WAV 等媒体地址由平台的对象存储提供，默认 7 天后回收（旧地址会返回 404）。请在这 7 天内把文件转存到你自己的存储；过期后重新调用[歌曲查询 API](current-music-query.md) 即可拿到**新的有效地址**，不需要重新生成歌曲，也不会额外计费。

## 常见使用场景

### 场景 1：快速生成背景音乐

```javascript
// Node.js 示例
const axios = require('axios');

async function generateMusic(description) {
  const response = await axios.post(
    'https://www.suno-api.io/api/music/create',
    {
      description: description,
      model: 'suno-v6',
      instrumental: true  // 纯音乐，无人声
    },
    {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
}

// 使用
generateMusic('轻松的咖啡厅背景音乐').then(songs => {
  console.log('生成的歌曲ID:', songs.map(s => s.song_id));
});
```

### 场景 2：自定义歌词和风格

```python
# Python 示例
import requests

def create_custom_song(lyrics, style, title):
    response = requests.post(
        'https://www.suno-api.io/api/music/create/custom',
        json={
            'lyrics': lyrics,
            'style_tags': style,
            'song_title': title,
            'model': 'suno-v6',
            'vocal_gender': 'male',
            'style_weight': 0.75,
            'weirdness_constraint': 0.25
        },
        headers={
            'Authorization': 'Bearer YOUR_API_KEY',
            'Content-Type': 'application/json'
        }
    )
    return response.json()

# 使用
songs = create_custom_song(
    lyrics='[Verse 1]\n春天来了\n花儿开了\n...',
    style='pop, acoustic, cheerful',
    title='春天的歌'
)
```

`vocal_gender` 支持 `m`、`f`、`male`、`female`；`style_weight` 和 `weirdness_constraint` 的范围均为 `0.0` 到 `1.0`。三个参数均可省略。

### 场景 3：轮询等待生成完成

```javascript
// 轮询查询直到生成完成
async function waitForCompletion(songIds, maxWaitTime = 120000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const response = await axios.post(
      'https://www.suno-api.io/api/music/query',
      {
        song_ids: songIds,
        model: 'suno-v6'
      },
      {
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY',
          'Content-Type': 'application/json'
        }
      }
    );

    const songs = response.data;
    const allCompleted = songs.every(s =>
      s.status === 'completed' || s.status === 'failed'
    );

    if (allCompleted) {
      return songs;
    }

    // 等待 5 秒后再次查询
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('生成超时');
}
```

## 错误处理

### 常见错误码

| HTTP 状态码 | 说明 | 解决方案 |
|------------|------|---------|
| 401 | 未授权 | 检查 API 密钥是否正确 |
| 402 | 余额不足 | 请充值后继续使用 |
| 429 | 请求过于频繁 | 降低请求频率，建议间隔 1 秒 |
| 500 | 服务器错误 | 稍后重试或联系技术支持 |

### 错误响应示例

```json
{
  "success": false,
  "message": "余额不足，请充值",
  "error_code": "INSUFFICIENT_BALANCE"
}
```

> **连接超时不是失败信号。** 生成类接口是同步接口，受理前不会有任何中间响应；客户端超时断开后，订单仍可能已经受理并正在生成，稍后能在 `GET /api/music/songs` 里看到。请把客户端超时设置为 300 秒以上，断开后先确认再决定是否重新提交，避免重复扣费。详见[新版 API 总览](./current-overview.md)的「等待时间与超时设置」。

## 最佳实践

1. **客户端超时**: 生成类接口在返回时才算受理完成，请把客户端超时设置为 300 秒以上
2. **异步处理**: 音乐生成需要约 60 秒，建议使用异步方式处理
3. **轮询间隔**: 查询生成状态时，建议间隔 5-10 秒
4. **错误重试**: 只对明确的失败响应（4xx/5xx）重试；连接超时或中断时，先用 `GET /api/music/songs` 确认订单是否已受理，避免重复下单与重复扣费
5. **密钥安全**: 不要在前端代码中暴露 API 密钥，应在后端调用
6. **批量查询**: 查询多首歌曲时，使用单次请求传入多个 song_ids

## 下一步

- 查看 [灵感模式生成 API 详细文档](./current-music-create.md)
- 查看 [专业模式生成 API 详细文档](./current-music-create-custom.md)
- 了解 [计费规则](./README.md#💰-计费说明)

## 需要帮助？

- 技术支持QQ群：926975276
- 在线文档: www.suno-api.io/docs
