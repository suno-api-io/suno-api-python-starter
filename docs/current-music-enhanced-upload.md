# 强化上传 API

## 接口说明

强化上传用于提交一首本地音频文件，由系统在后台执行增强处理，并生成可播放的完整歌曲结果。接口提交后会立即返回任务信息，客户端需要通过查询接口轮询任务进度。

**提交接口地址**: `POST /api/music/enhanced-upload`

**单任务查询地址**: `GET /api/music/enhanced-upload/:id`

**取消任务地址**: `POST /api/music/enhanced-upload/:id/cancel`

**列表查询地址**: `GET /api/music/enhanced-upload`

**计费**: 10 元/次，按 `suno-enhanced-upload` 固定价格预扣费。任务失败或在允许阶段取消时会自动退回预扣费用，实际扣费以当前后台价格配置为准。

## 调用流程

1. 调用 `POST /api/music/enhanced-upload` 上传音频文件。
2. 保存返回的 `task_id`。
3. 调用 `GET /api/music/enhanced-upload/:id` 查询进度和结果。
4. Suno 最终渲染完成后，服务使用该次任务绑定的 Suno 账号调用 Studio 授权下载接口，将 MP3 写入 CN2 媒体服务。
5. 只有 CN2 资产准备成功，任务才会变为 `completed`，此时从响应中的 `audio_url` 获取 CDN 音频地址。

`/api/forbidden` 是 Suno Studio 元数据中可能出现的占位地址，不是可播放或可下载资源。它不会返回给客户，也不会作为完成依据。若渲染已完成但 CN2 仍在准备，接口会继续返回 `processing` 且不返回 `audio_url`；客户端应继续轮询，不应将空地址视为失败。

## 提交强化上传

### Headers

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | Bearer YOUR_API_KEY |
| Content-Type | string | 否 | multipart 请求不要手动指定，由客户端自动生成 |

### Form 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| file | file | 是 | - | 本地音频文件，最大 80 MB |
| title | string | 否 | 文件名去后缀 | 歌曲标题 |

### 请求示例

下面示例使用的是生产验证时相同的调用方式，但 API Key 已替换为占位符。

```bash
curl.exe --http1.1 -s -S \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@source.aac" \
  -F "title=Enhanced upload demo" \
  "https://www.suno-api.io/api/music/enhanced-upload"
```

### 响应结果

```json
{
  "success": true,
  "message": "",
  "data": {
    "task_id": 3209,
    "song_id": "pending:enhanced-upload:cu_20260611003241723483700xnCcQg",
    "client_request_id": "cu_20260611003241723483700xnCcQg",
    "title": "Enhanced upload demo",
    "file_name": "source.aac",
    "status": "queued",
    "created_at": 1781137961,
    "pre_consumed_quota": 5000000,
    "billing_source": "wallet"
  }
}
```

## 查询单个任务

### 请求示例

```bash
curl.exe --http1.1 -s -S \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://www.suno-api.io/api/music/enhanced-upload/3209"
```

### 处理中响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "task": {
      "task_id": 3209,
      "song_id": "pending:enhanced-upload:cu_20260611003241723483700xnCcQg",
      "client_request_id": "cu_20260611003241723483700xnCcQg",
      "title": "Enhanced upload demo",
      "file_name": "source.aac",
      "status": "processing",
      "type": "enhanced_upload",
      "progress": {
        "stage": "media_preparing",
        "percent": 98,
        "label": "正在准备播放资源",
        "updated_at": 1781138500
      },
      "pre_consumed_quota": 5000000,
      "billing_source": "wallet",
      "created_at": 1781137961,
      "updated_at": 1781138500
    }
  }
}
```

### 完成响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "task": {
      "task_id": 3209,
      "song_id": "56cbd0bb-0e8c-4a34-8729-55d5c05d9c53",
      "client_request_id": "cu_20260611003241723483700xnCcQg",
      "title": "Enhanced upload demo",
      "file_name": "source.aac",
      "status": "completed",
      "type": "enhanced_upload",
      "audio_url": "https://media.code-go.com/assets/56cbd0bb-0e8c-4a34-8729-55d5c05d9c53-mp3.mp3",
      "duration": 217.74,
      "progress": {
        "stage": "completed",
        "percent": 100,
        "label": "已完成",
        "updated_at": 1781138943
      },
      "pre_consumed_quota": 5000000,
      "billing_source": "wallet",
      "created_at": 1781137961,
      "updated_at": 1781138943,
      "completed_at": 1781138943
    }
  }
}
```

## 取消任务

只有任务和后台 workflow 都仍处于 `queued` 阶段时可以取消。任务进入 `leasing`、`running`、`processing` 或已完成后无法取消。

### 请求示例

```bash
curl.exe --http1.1 -s -S -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://www.suno-api.io/api/music/enhanced-upload/3209/cancel"
```

### 响应结果

```json
{
  "success": true,
  "message": "",
  "data": {
    "task_id": 3209,
    "song_id": "pending:enhanced-upload:cu_20260611003241723483700xnCcQg",
    "client_request_id": "cu_20260611003241723483700xnCcQg",
    "status": "cancelled"
  }
}
```

如果任务已经开始处理，接口会返回：

```json
{
  "success": false,
  "message": "强化上传已开始处理，无法取消"
}
```

## 查询任务列表

列表接口只返回当前 API Key 所属用户的强化上传任务，不会混入普通生成、翻唱、续写等任务。

### Query 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| p | number | 否 | 1 | 页码 |
| page_size | number | 否 | 系统默认值 | 每页数量，最大 100 |

### 请求示例

```bash
curl.exe --http1.1 -s -S \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://www.suno-api.io/api/music/enhanced-upload?p=1&page_size=3"
```

### 响应结果

```json
{
  "success": true,
  "message": "",
  "data": {
    "page": 1,
    "page_size": 3,
    "total": 1,
    "items": [
      {
        "task_id": 3209,
        "song_id": "56cbd0bb-0e8c-4a34-8729-55d5c05d9c53",
        "client_request_id": "cu_20260611003241723483700xnCcQg",
        "title": "Enhanced upload demo",
        "file_name": "source.aac",
        "status": "completed",
        "type": "enhanced_upload",
        "audio_url": "https://media.code-go.com/assets/56cbd0bb-0e8c-4a34-8729-55d5c05d9c53-mp3.mp3",
        "duration": 217.74,
        "progress": {
          "stage": "completed",
          "percent": 100,
          "label": "已完成",
          "updated_at": 1781138943
        },
        "pre_consumed_quota": 5000000,
        "billing_source": "wallet",
        "created_at": 1781137961,
        "updated_at": 1781138943,
        "completed_at": 1781138943
      }
    ]
  }
}
```

## 返回字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| task_id | number | 强化上传任务 ID，后续查询和取消使用该值 |
| song_id | string | 处理中为 `pending:enhanced-upload:*`，完成后为真实歌曲 ID |
| client_request_id | string | 客户端请求追踪 ID |
| status | string | 任务状态，如 `queued`、`processing`、`completed`、`failed`、`cancelled` |
| type | string | 固定为 `enhanced_upload` |
| audio_url | string | 完成后的音频地址 |
| duration | number | 音频时长，单位秒 |
| progress.stage | string | 当前处理阶段 |
| progress.percent | number | 进度百分比 |
| progress.label | string | 面向用户显示的进度文案 |
| pre_consumed_quota | number | 本次预扣额度 |
| billing_source | string | 扣费来源，如 `wallet` |
| error_message | string | 失败原因 |

## 注意事项

- 当前接口只支持 multipart 文件上传，不支持 JSON `file_url` 或 `file_base64`。
- 上传文件最大 80 MB。
- 提交接口是异步接口，返回 `queued` 表示任务已入队，不代表音频已经完成。
- 取消只适用于尚未开始处理的任务；进入处理阶段后不会中断平台账号工作流。
- 请不要在客户端代码中暴露真实 API Key。

## 强化上传完成后发起翻唱

强化上传完成后，可以把完成结果作为源 clip，调用 `POST /api/music/generate-from-source` 发起翻唱。

> 注意：翻唱是**同步接口**，返回时才代表订单已受理，实测最长可能等待约 230 秒。请把客户端超时设置为 300 秒以上，且超时后不要立即重试。详见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

请先轮询 `GET /api/music/enhanced-upload/:id`，直到 `task.status` 为 `completed`。此时：

- `task.song_id` 是真实歌曲 ID，也是翻唱接口需要的 `sourceClipId`；
- `task.audio_url` 建议作为 `sourceAudioUrl` 一并传入，便于服务端处理源 clip 与执行账号不一致的情况；
- `task.task_id` 只是强化上传任务 ID，不能作为 `sourceClipId`；
- `pending:enhanced-upload:*` 是处理阶段的占位 ID，不能用于翻唱。

发起翻唱时，请使用与强化上传相同的 API Key，并按下面的字段关系组装请求：

| 翻唱请求字段 | 取值来源 |
|---|---|
| `sourceClipId` | 强化上传完成结果中的 `task.song_id` |
| `sourceAudioUrl` | 强化上传完成结果中的 `task.audio_url` |
| `sourceTitle` | 强化上传完成结果中的 `task.title` |

其余歌词、风格、标题、模型等参数按照《基于源 clip 翻唱 API》填写。翻唱接口返回新的 `clips[].song_id` 后，使用 `POST /api/music/query` 查询生成状态和最终音频。
