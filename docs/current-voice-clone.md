# 人声克隆与指定人声生成 API（不推荐）

> **⛔ 旧链路，不推荐新接入。** 本文档描述的是早期 `persona`（`voice_task_id` / `generate-with-voice`）链路，仍然可用，但**不再对外推荐**；左侧导航里已标注「不推荐」。
>
> 新接入请用[【推荐】克隆音色 API](current-clone-voice.md)：用一段人声样本创建音色（`POST /api/music/voice-profile/create`），再用它翻唱指定歌曲或演唱新歌。音色是一等资源，可以列表、查询、删除，且源音频永久保留。
>
> 如果你的产品需要"创建音色 → 长期复用 → 翻唱"的完整闭环，请优先接新链路。

> **重要提示：克隆人声可能过期。**
>
> 人声克隆生成的 `voice_id` / `voice_task_id` 不是永久可用资源，可能因有效期、账号状态或人声状态变化而失效。接入方不要只在首次克隆成功后永久复用本地缓存的人声 ID。
>
> 推荐做法：
>
> - 保存 `voice_task_id`、`voice_id`、`is_available`、`updated_at` 和最近一次生成成功时间。
> - 每次使用已克隆人声生成前，先调用 `GET /api/voice/clone/tasks/{voice_task_id}` 或 `POST /api/voice/clone/tasks/{voice_task_id}/check` 确认 `is_available=true`。
> - 如果接口返回人声不可用、任务不存在、`selected voice is not ready` 等错误，请提示用户重新克隆或重新选择可用人声。
> - 不建议把克隆人声做成“永久资产”承诺给终端用户；应在产品界面中提示“人声可能过期，需要重新校验或重新克隆”。

## 接口说明

本组接口用于创建可复用的人声，并使用该人声生成歌曲。调用方只需要使用平台发放的 API Key，服务端会统一处理任务提交、状态同步、计费和下载。

**认证方式**: `Authorization: Bearer YOUR_API_KEY`

**计费**:

- 人声校验、人声克隆、状态查询、删除、下载：免费。
- 工作台的一步式克隆入口：固定 5 元/次，自动完成源人声校验与二次验证音频，失败会退款。
- 普通克隆完成后继续自动生成验证音频：固定 5 元/次；失败按现有流程退款。
- 使用已克隆人声生成歌曲：收费，固定 1.2 元/次，每次通常返回 2 个占位任务。
- 开启 Max Mode（`POST /api/music/generate-with-voice` 传 `max_mode: true`）时，
  上述 1.2 元/次按 2 倍计费，即 **2.4 元/次**；人声生成也支持 `variety`（0-4，
  不额外计费），取值规则见[新版 API 总览](current-overview.md) 的「高级参数」一节。

## 调用流程

1. 调用 `POST /api/voice/clone/validate` 上传源人声，获取 `voice_task_id`。
2. 等待或轮询 `GET /api/voice/clone/tasks/{voice_task_id}`，拿到 `validate_info`。
3. 用户按 `validate_info` 朗读并录制验证音频。
4. 调用 `POST /api/voice/clone/tasks/{voice_task_id}/generate` 提交验证音频。
5. 调用 `POST /api/voice/clone/tasks/{voice_task_id}/check` 或继续查询任务，直到 `is_available=true`。
6. 调用 `POST /api/music/generate-with-voice` 使用该人声生成歌曲。
7. 生成接口会先返回占位任务；歌曲生成完成并拿到实际 `song_id` 后，可用下载接口下载单文件或打包文件。
8. （可选）不再需要这个人声时，调用 `DELETE /api/voice/clone/voices/{voice_task_id}` 删除，语义见第 6 节。

此外还有**一步式克隆**：在工作台的首次录音/上传源人声页面选择一步完成，系统会一次性完成校验与音色生成，**不需要你再录第二段验证音频**；按 5 元/次计费，失败退款。

## 人声任务字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `voice_task_id` | number | 平台内的人声任务 ID，后续接口都使用这个 ID |
| `voice_id` | string | 可用于生成歌曲的人声 ID，任务可用后返回 |
| `voice_name` | string | 人声名称 |
| `description` | string | 人声描述 |
| `style` | string | 人声风格 |
| `singer_skill_level` | string | 演唱水平，常用值：`beginner`、`intermediate`、`professional` |
| `language` | string | 源人声语言，例如 `zh`、`en` |
| `validate_info` | string | 需要朗读的验证文本 |
| `validate_status` | string | 校验任务状态 |
| `voice_status` | string | 人声生成状态 |
| `is_available` | boolean | 是否已经可用于生成歌曲 |
| `status` | string | 平台任务状态 |
| `stage` | string | 当前阶段 |
| `error_code` | string | 失败错误码 |
| `error_message` | string | 失败原因 |
| `source_duration_seconds` | number | 源音频时长，单位秒 |
| `created_at` | number | 创建时间戳 |
| `updated_at` | number | 更新时间戳 |
| `completed_at` | number | 完成时间戳 |

## 1. 提交源人声校验

**接口地址**: `POST /api/voice/clone/validate`

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `voice_url` | string | 否 | - | 源人声音频 URL。与 `file_base64` 二选一 |
| `file_base64` | string | 否 | - | Base64 音频。与 `voice_url` 二选一 |
| `file_name` | string | 否 | - | 文件名，使用 `file_base64` 时建议传入 |
| `voice_name` | string | 否 | 自动生成 | 人声名称 |
| `description` | string | 否 | - | 人声描述 |
| `style` | string | 否 | - | 人声风格 |
| `singer_skill_level` | string | 否 | `beginner` | 演唱水平 |
| `language` | string | 否 | `zh` | 源人声语言 |
| `vocal_start_s` | number | 是 | - | 有效人声开始秒数 |
| `vocal_end_s` | number | 是 | - | 有效人声结束秒数 |
| `source_duration_seconds` | number | 否 | - | 源音频总时长，单位秒 |

> `vocal_end_s - vocal_start_s` 需要满足最短人声片段要求。建议上传清晰、无明显伴奏和噪声的人声录音。

### 请求示例

```bash
curl -X POST https://www.suno-api.io/api/voice/clone/validate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "voice_url": "https://example.com/source-voice.wav",
    "voice_name": "我的中文女声",
    "description": "清亮自然的中文女声",
    "style": "Mandopop",
    "singer_skill_level": "intermediate",
    "language": "zh",
    "vocal_start_s": 1.2,
    "vocal_end_s": 18.5,
    "source_duration_seconds": 20
  }'
```

### 响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "voice": {
      "voice_task_id": 123,
      "voice_name": "我的中文女声",
      "language": "zh",
      "validate_status": "submitted",
      "is_available": false,
      "status": "validate_submitted",
      "stage": "validate_submitted",
      "created_at": 1780480000,
      "updated_at": 1780480000
    }
  }
}
```

## 2. 查询人声任务

**接口地址**: `GET /api/voice/clone/tasks/{voice_task_id}`

### 请求示例

```bash
curl https://www.suno-api.io/api/voice/clone/tasks/123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "voice": {
      "voice_task_id": 123,
      "voice_name": "我的中文女声",
      "validate_info": "请朗读这里返回的验证文本",
      "validate_status": "success",
      "is_available": false,
      "status": "validate_ready",
      "stage": "validate_callback"
    }
  }
}
```

## 3. 重新生成验证文本

**接口地址**: `POST /api/voice/clone/tasks/{voice_task_id}/regenerate`

当验证文本不适合朗读或需要重新校验时可调用。

```bash
curl -X POST https://www.suno-api.io/api/voice/clone/tasks/123/regenerate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 4. 提交验证音频并创建人声

**接口地址**: `POST /api/voice/clone/tasks/{voice_task_id}/generate`

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `verify_url` | string | 否 | - | 按验证文本朗读的音频 URL。与 `file_base64` 二选一 |
| `file_base64` | string | 否 | - | Base64 验证音频。与 `verify_url` 二选一 |
| `file_name` | string | 否 | - | 文件名，使用 `file_base64` 时建议传入 |
| `voice_name` | string | 否 | 沿用任务名称 | 人声名称 |
| `description` | string | 否 | 沿用任务描述 | 人声描述 |
| `style` | string | 否 | 沿用任务风格 | 人声风格 |
| `singer_skill_level` | string | 否 | 沿用任务设置 | 演唱水平 |

### 请求示例

```bash
curl -X POST https://www.suno-api.io/api/voice/clone/tasks/123/generate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "verify_url": "https://example.com/verify-voice.wav",
    "voice_name": "我的中文女声"
  }'
```

## 5. 检查人声是否可用

**接口地址**: `POST /api/voice/clone/tasks/{voice_task_id}/check`

```bash
curl -X POST https://www.suno-api.io/api/voice/clone/tasks/123/check \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

任务可用时响应中的 `is_available` 为 `true`，并返回 `voice_id`。

## 6. 删除人声

**接口地址**: `DELETE /api/voice/clone/voices/{voice_task_id}`

**计费**: 免费。

```bash
curl -X DELETE https://www.suno-api.io/api/voice/clone/voices/123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "voice_task_id": 123,
    "deleted": true
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| voice_task_id | number | 被删除的人声任务 ID |
| deleted | boolean | 固定为 `true`，表示删除请求已被受理 |

### 删除之后会怎样

- **不能再用来生成新歌**：继续拿这个 `voice_task_id`（或它的 `voice_id`）调用 `POST /api/music/generate-with-voice` 会被拒绝，错误信息是 `selected voice is not ready`，不扣费。
- **已经用它生成的歌完全不受影响**：播放、下载、续写、替换、分轨都照旧。
- **这条人声任务会从查询里消失**：`GET /api/voice/clone/tasks/{voice_task_id}` 返回 `record not found`。
- **源音频按平台的永久保留策略保留**（2026-09-23 起，删除不会再清理你上传的那段人声素材），但**这不等于可以恢复**：旧的这条任务已经终止，想继续用同一个声音，需要重新走一遍克隆流程，会拿到**新的 `voice_task_id`**。
- **重复删除**：对同一条任务再删一次返回 `record not found`（它已经是删除态，查不到了）。

## 7. 使用已克隆人声生成歌曲

**接口地址**: `POST /api/music/generate-with-voice`

**计费**: 1.2 元/次。

### Body 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `voice_task_id` | number | 是 | - | 已可用的人声任务 ID |
| `voice_id` | string | 否 | - | 可选校验字段；传入时必须和任务中的 `voice_id` 一致 |
| `customMode` | boolean | 否 | `false` | `false` 为灵感模式，`true` 为高级模式 |
| `prompt` | string | 是 | - | 灵感模式为歌曲描述；高级模式为歌词。两种模式都不能为空 |
| `style` | string | 高级模式是 | - | 风格标签；`customMode=true` 时不能为空 |
| `title` | string | 高级模式是 | - | 歌曲标题；`customMode=true` 时不能为空 |
| `negativeTags` | string | 否 | - | 负向风格 |
| `instrumental` | boolean | 否 | `false` | 兼容字段；克隆声音生成固定按非纯音乐处理 |
| `waitAudio` | boolean | 否 | `false` | 兼容字段；本接口固定异步返回占位任务，不等待音频完成 |
| `model` | string | 否 | `suno-v6` | 普通歌曲生成模型；可用 `suno-v6`、`suno-v6-wild` 或 `suno-v6-mini` |
| `vocalGender` | string | 否 | - | 人声性别偏好 |
| `lyricsMode` | string | 否 | - | 兼容字段；当前克隆声音提交链路不单独改变歌词模式 |
| `weirdnessConstraint` | number | 否 | - | 创意强度 |
| `styleWeight` | number | 否 | - | 风格权重 |
| `audioWeight` | number | 否 | 平台默认 | Audio Influence（音频参考度），范围 `0.0`-`1.0`。**不传时按平台默认处理**（相当于官方界面 25%）；`0` 是有效值，表示完全不向引用源靠拢。它与上一条 `sourceClipId` 强相关：传入来源时它指向**参考音频**，不传来源时它指向**克隆音色**——平台只有这一条滑杆同时覆盖两种情况，不要按业务拆成两个参数 |
| `sourceClipId` | string | 否 | - | 来源歌曲的真实工作区 clip ID。传入后进入克隆声音翻唱；不传则为普通克隆声音生成 |
| `sourceAudioUrl` | string | 否 | - | 来源展示字段，不参与所有权或账号判定，服务端以数据库记录为准 |
| `sourceTitle` | string | 否 | - | 来源展示字段，不参与所有权或账号判定 |
| `clientSubmissionId` | string | 否 | - | Create UI 兼容字段；客户 API 的可靠去重必须使用 `Idempotency-Key` Header |

支持 `suno-v6`、`suno-v6-wild` 和 `suno-v6-mini`；空模型按 `suno-v6` 处理。旧的 V5/V5.5 模型已下线，但历史任务可能仍显示旧模型名。

共享请求结构还能解析 `task`、`soundType`、`soundLoop`、`soundBpm`、`soundKey`、`voiceTaskId`、`voiceId` 等 Create UI 兼容字段，但它们不是本接口的有效客户参数：声音任务必须传 `voice_task_id`，可选声音校验必须传 `voice_id`，声音音乐生成不会读取 sound 字段。

### 生成参数填写说明

- `customMode=false` 时，`prompt` 填歌曲描述；`customMode=true` 时，`prompt` 填完整歌词，`style` 和 `title` 也必须填写。不要把“歌词”误传到灵感模式的描述字段，或把歌曲描述当作高级模式歌词。
- `weirdnessConstraint` 和 `styleWeight` 都是 `0.0` 到 `1.0` 的比例小数，不能填写 `50` 或 `50%`。一般可用 `0.5` 作为均衡值；省略表示不指定，`0` 则是有效的显式值。
- `vocalGender` 只能使用 `m`、`male`、`f` 或 `female`。`instrumental` 在本接口中仅为兼容字段，克隆声音生成固定按人声歌曲处理。
- `waitAudio` 在本接口中不会改变行为，接口固定异步返回占位任务。初始结果中的 `audio_url` 为空是正常现象，请使用 `client_request_id` 查询，直到结果完成后再读取音频地址。

### Header 参数

| Header | 必填 | 说明 |
|---|---|---|
| `Authorization: Bearer ...` | 是 | 客户 API Token |
| `Content-Type: application/json` | 是 | JSON 请求体 |
| `Idempotency-Key` | 否，强烈建议 | 最长 128 字符。相同用户、Token、端点、Key 和请求体只计费并创建一次任务 |

`Idempotency-Key` 行为：

- 首次请求在计费前写入持久幂等记录；
- 相同 Key、相同请求已完成时，重放第一次的接收响应，不重复计费或建任务；
- 相同 Key、不同请求体会被拒绝；
- 相同 Key 仍在处理中时返回稳定的处理中错误，并且只在已生成时返回安全的 `client_request_id`；
- 相同 Key 的首次请求失败后保持失败状态，重试必须换新 Key。

### `sourceClipId` 翻唱条件

客户 API 的来源翻唱由服务端统一处理来源歌曲访问，不需要客户传递任何账号信息。是否可用以接口实际响应为准。

来源必须属于当前 API 用户，是已完成、非 `pending:` 的工作区歌曲，并有可用音频。支持普通生成、普通上传来源和强化上传最终歌曲；强化上传中间记录会在计费前拒绝。服务端只接受客户提交的来源歌曲 ID，不接受客户传账号 ID；来源不可用或未完成时会在计费前返回错误。

### 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/generate-with-voice \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "voice_task_id": 123,
    "customMode": true,
    "prompt": "写一首关于夏夜海边的中文流行歌曲",
    "style": "Mandopop, warm piano, emotional",
    "title": "夏夜海风",
    "negativeTags": "noise, low quality",
    "instrumental": false,
    "model": "suno-v6"
  }'
```

### 响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "client_request_id": "cu_1780480000_abcd1234",
    "items": [
      {
        "placeholder_id": "pending:cu_1780480000_abcd1234:0",
        "client_request_id": "cu_1780480000_abcd1234",
        "client_request_index": 0,
        "status": "submitted",
        "type": "voice_generate",
        "title": "夏夜海风",
        "prompt": "写一首关于夏夜海边的中文流行歌曲"
      },
      {
        "placeholder_id": "pending:cu_1780480000_abcd1234:1",
        "client_request_id": "cu_1780480000_abcd1234",
        "client_request_index": 1,
        "status": "submitted",
        "type": "voice_generate",
        "title": "夏夜海风",
        "prompt": "写一首关于夏夜海边的中文流行歌曲"
      }
    ],
    "pre_consumed_quota": 600000,
    "billing_source": "wallet"
  }
}
```

### 关于占位任务和最终 `song_id`

`generate-with-voice` 是异步生成接口。接口返回成功只表示生成任务已经提交，不表示歌曲已经生成完成。

响应中的关键字段含义：

| 字段 | 说明 |
|---|---|
| `client_request_id` | 本次生成请求的追踪 ID。一次请求通常生成 2 首歌，两个结果都使用同一个 `client_request_id`。 |
| `items[].placeholder_id` | 平台本地占位 ID，格式通常是 `pending:{client_request_id}:{index}`。它不是最终歌曲 ID。 |
| `items[].client_request_index` | 同一次请求中的结果序号，通常为 `0` 和 `1`。 |
| `items[].status` | 提交后的初始状态，例如 `submitted`。后续生成成功或失败以最终任务记录为准。 |

注意：`pending:` 开头的 `placeholder_id` 不能作为最终 `song_id` 使用，也不能直接用于 `/api/music/query` 或下载接口。只用 `pending:*` 调用 `/api/music/query` 时，可能会返回空数组 `[]`，这是因为真实歌曲还没有完成，或占位任务还没有替换成最终歌曲 ID。

错误示例：

```json
{
  "song_ids": "pending:cu_1780480000_abcd1234:0"
}
```

正确流程：

1. 调用 `POST /api/music/generate-with-voice` 提交人声生成音乐任务。
2. 保存响应里的 `client_request_id`、`items[].placeholder_id` 和 `items[].client_request_index`。
3. 轮询 `GET /api/music/generate-with-voice/results?client_request_id=cu_xxx`。
4. 等返回里的 `items[].song_id` 有值且不以 `pending:` 开头后，再调用 `/api/music/query`、`/api/music/download-file` 或 `/api/music/download-all`。

当前版本已新增公开查询接口：

`GET /api/music/generate-with-voice/results?client_request_id=cu_xxx`

它返回当前用户下同一个 `client_request_id` 对应的任务结果，适合客户自助查询最终 `song_id`。返回列表里：

- `song_id` 是真实歌曲 ID；
- `placeholder_id` 仅在任务仍处于占位状态时出现；
- `pending:` 开头的值不能用于 `/api/music/query` 或下载接口。

若你只保存了 `client_request_id` 或 `pending:*` 占位 ID，可以先调用这个结果接口查询；如果还没查到真实 `song_id`，再把 `client_request_id` 发给技术支持协助定位。

### 查询人声生成音乐结果

**接口地址**: `GET /api/music/generate-with-voice/results`

**计费**: 免费。

### Query 参数

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `client_request_id` | string | 是 | `generate-with-voice` 返回的请求追踪 ID |

### 请求示例

```bash
curl -X GET "https://www.suno-api.io/api/music/generate-with-voice/results?client_request_id=cu_1780480000_abcd1234" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 生成中响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "client_request_id": "cu_1780480000_abcd1234",
    "status": "processing",
    "items": [
      {
        "song_id": "",
        "placeholder_id": "pending:cu_1780480000_abcd1234:0",
        "client_request_id": "cu_1780480000_abcd1234",
        "client_request_index": 0,
        "status": "processing",
        "type": "voice_generate",
        "title": "夏夜海风"
      }
    ]
  }
}
```

### 生成完成响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "client_request_id": "cu_1780480000_abcd1234",
    "status": "completed",
    "items": [
      {
        "song_id": "song_abc123",
        "client_request_id": "cu_1780480000_abcd1234",
        "client_request_index": 0,
        "status": "completed",
        "type": "voice_generate",
        "title": "夏夜海风",
        "audio_url": "https://...",
        "image_url": "https://...",
        "duration": 180.5
      }
    ]
  }
}
```

### 顶层 `status` 含义

| 状态 | 说明 |
|---|---|
| `not_found` | 当前用户下还没有查到该 `client_request_id` 的任务记录 |
| `processing` | 至少还有一个结果未完成，继续轮询 |
| `completed` | 所有结果都已完成，可以使用 `song_id` 查询或下载 |
| `partial` | 部分完成、部分失败，可先处理已完成的 `song_id` |
| `failed` | 所有结果失败，查看 `items[].error_message` |

## 8. 下载单个文件

**接口地址**: `POST /api/music/download-file`

### Body 参数

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `song_id` | string | 是 | 歌曲 ID |
| `kind` | string | 是 | 下载类型：`audio`、`cover`、`wav`、`video` |

### 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/download-file \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "song_abc123",
    "kind": "audio"
  }' \
  --output song.mp3
```

响应为文件流，`Content-Type` 和文件名以后端返回为准。

## 9. 打包下载歌曲资源

**接口地址**: `POST /api/music/download-all`

### Body 参数

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `song_id` | string | 是 | 歌曲 ID |

### 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/download-all \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "song_abc123"
  }' \
  --output song.zip
```

打包文件通常包含音频、封面和 `metadata.json`；如果某类资源暂未生成，则不会放入压缩包。

## 常见错误

| message | 说明 |
|---|---|
| `voice audio is required` | 提交源人声时未提供 `voice_url` 或 `file_base64` |
| `invalid voice task id` | 路径中的人声任务 ID 无效 |
| `voice validation is not ready` | 尚未拿到验证文本，不能提交验证音频 |
| `selected voice is not ready` | 选择的人声尚不可用于生成歌曲（未就绪、已删除，或不属于当前账号） |
| `selected voice does not match voice task` | 请求中的 `voice_id` 与任务不一致 |
| `voice task is required` | 生成人声歌曲时缺少 `voice_task_id` |
| `record not found` | 任务 / 歌曲不存在、不属于当前 API Key 所属账号，或**已经被删除**（删除人声后再查这条任务也会看到它） |

> 本组接口的错误**统一返回 HTTP 200**：请以响应体里的 `success` 字段判断成败（`false` 即失败，原因见 `message`），不要只看 HTTP 状态码。
> 删除人声的完整语义（删除后还能不能用、能不能恢复）见第 6 节。
