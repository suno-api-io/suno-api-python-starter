# 音乐商用授权书 API

## 接口说明

音乐商用授权书接口用于查询当前 API Key 所属用户可授权的歌曲、生成 PDF 授权书、查询授权书历史与下载已签发文件。

所有接口统一使用 New API Key：

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

基础地址：

```text
https://www.suno-api.io
```

## 使用前提

- API Key 必须有效，并归属于需要签发授权书的用户。
- 用户需要先完成授权身份绑定（见下方「0. 授权资格与身份」）；身份一旦确认将按产品规则锁定。
- 用户需要满足个人或公司的累计充值资格要求。
- 普通接口只返回脱敏身份信息，不返回身份证号、手机号、统一社会信用代码等明文。
- 每首歌曲只能成功签发一份授权书；生成失败的授权书不会占用歌曲资格。
- 当前支持已完成、有音频且具有真实 Suno Song ID 的指定生成类型。具体是否可选以歌曲列表中的 `authorization.selectable` 为准。

## 0. 授权资格与身份

签发授权书之前，需要先查询资格并绑定身份。这两个接口都是免费接口。

### 0.1 查询授权资格与身份状态

**接口地址**: `GET /api/music/authorization/context`

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "identity": {
      "exists": false
    },
    "eligibility": {
      "current_amount": 216.3,
      "personal_required_amount": 200,
      "company_required_amount": 500,
      "personal_eligible": true,
      "company_eligible": false
    },
    "stats": {
      "authorized_song_count": 0,
      "certificate_count": 0
    }
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| identity.exists | boolean | 是否已经绑定授权身份；`true` 时会返回脱敏后的身份信息 |
| eligibility.current_amount | number | 当前累计充值金额（元） |
| eligibility.personal_required_amount | number | 个人授权所需累计充值门槛 |
| eligibility.company_required_amount | number | 企业授权所需累计充值门槛 |
| eligibility.personal_eligible / company_eligible | boolean | 当前是否满足对应资格 |
| stats.authorized_song_count / certificate_count | number | 已授权歌曲数与已签发授权书数 |

### 0.2 绑定授权身份

**接口地址**: `POST /api/music/authorization/identity`

```json
{
  "identity_type": "personal",
  "legal_name": "张三",
  "id_number": "110101199001010000",
  "contact_name": "张三",
  "phone": "13800000000",
  "email": "user@example.com",
  "address": "北京市朝阳区",
  "confirm_locked": true
}
```

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| identity_type | string | 是 | `personal`（个人）或 `company`（企业） |
| legal_name | string | 是 | 个人姓名 |
| id_number | string | 是 | 个人身份证号（服务端加密存储，普通接口只返回脱敏结果） |
| company_name | string | 企业必填 | 企业名称 |
| credit_code | string | 企业必填 | 统一社会信用代码 |
| contact_name | string | 是 | 联系人 |
| phone | string | 是 | 联系电话 |
| email | string | 是 | 联系邮箱 |
| address | string | 否 | 联系地址 |
| confirm_locked | boolean | 是 | 确认身份信息锁定；传 `true` 表示接受绑定后不可自行修改 |

响应返回脱敏后的身份信息：`{"identity": {...}}`。绑定成功后请用 `context` 接口确认
`identity.exists` 已变为 `true`，再调用歌曲列表与签发接口。身份信息如需修改，需联系客服处理。

## 1. 查询可授权歌曲

**接口地址**: `GET /api/music/authorization/songs`

### Query 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `p` | number | 否 | `1` | 页码 |
| `page_size` | number | 否 | 系统默认值 | 每页数量，最大 100 |
| `q` | string | 否 | - | 按标题、提示词或精确 Suno Song ID 搜索 |
| `status` | string | 否 | `all` | `all`、`selectable`、`authorized` 或 `unavailable` |

### 请求示例

```bash
curl "https://www.suno-api.io/api/music/authorization/songs?p=1&page_size=20&status=selectable" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "items": [
      {
        "task_id": 10001,
        "suno_song_id": "suno-song-id-1",
        "title": "示例歌曲",
        "generation_type": "generate",
        "completed_at": 1784000000,
        "created_at": 1783999000,
        "audio_url": "https://example.com/audio.mp3",
        "model_name": "suno-v6",
        "authorization": {
          "selectable": true
        }
      }
    ]
  }
}
```

`authorization.selectable=false` 时，响应会通过 `reason_code` 和 `reason` 说明不可授权原因。已经签发过授权书的歌曲还会返回 `certificate_id` 和 `certificate_no`。

## 2. 生成授权书

**接口地址**: `POST /api/music/authorization/certificates`

### Body 参数

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `song_ids` | string[] | 是 | 需要授权的真实 Suno Song ID 列表 |
| `confirm_risk_terms` | boolean | 是 | 必须为 `true`，表示已确认授权范围与风险条款 |

### 请求示例

```bash
curl -X POST https://www.suno-api.io/api/music/authorization/certificates \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "song_ids": ["suno-song-id-1", "suno-song-id-2"],
    "confirm_risk_terms": true
  }'
```

### 响应示例

```json
{
  "success": true,
  "message": "",
  "data": {
    "certificate": {
      "id": 101,
      "certificate_no": "CERTIFICATE-NO",
      "verification_code": "VERIFY-CODE",
      "status": "issued",
      "song_count": 2,
      "identity_type_snapshot": "personal",
      "licensee_name_masked": "张*",
      "document_no_masked_snapshot": "11**************34",
      "phone_masked_snapshot": "138****0000",
      "pdf_sha256": "PDF_SHA256",
      "issued_at": 1784000100,
      "created_at": 1784000000,
      "updated_at": 1784000100,
      "download_url": "/api/music/authorization/certificates/101/download",
      "songs": []
    }
  }
}
```

成功响应中的 `status` 为 `issued`。如果 PDF 渲染失败，证书会标记为 `failed`，相关歌曲仍可在问题修复后重新提交。

## 3. 查询授权书历史

**接口地址**: `GET /api/music/authorization/certificates`

### Query 参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `p` | number | 否 | `1` | 页码 |
| `page_size` | number | 否 | 系统默认值 | 每页数量，最大 100 |
| `q` | string | 否 | - | 按证书号或脱敏授权人名称搜索 |

### 请求示例

```bash
curl "https://www.suno-api.io/api/music/authorization/certificates?p=1&page_size=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 响应结构

响应的 `data` 为分页对象，包含 `page`、`page_size`、`total` 和 `items`。`items` 中每一项为授权书摘要，并包含该授权书的歌曲快照。

## 4. 查询授权书详情

**接口地址**: `GET /api/music/authorization/certificates/:id`

路径参数 `id` 为授权书数字 ID。接口只允许访问当前 API Key 所属用户自己的授权书。

### 请求示例

```bash
curl https://www.suno-api.io/api/music/authorization/certificates/101 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 响应结构

成功时返回 `data.certificate`，字段包括证书号、状态、脱敏授权人信息、签发时间、PDF 校验值、下载地址和授权歌曲快照。

## 5. 下载授权书 PDF

**接口地址**: `GET /api/music/authorization/certificates/:id/download`

仅状态为 `issued` 的授权书可以下载。下载请求仍需携带有效 API Key，并且只能下载当前用户自己的授权书。

### 请求示例

```bash
curl https://www.suno-api.io/api/music/authorization/certificates/101/download \
  -H "Authorization: Bearer YOUR_API_KEY" \
  --output authorization-certificate.pdf
```

成功响应为 `application/pdf` 文件流，文件名以后端 `Content-Disposition` 为准。

## 常见失败原因

| 场景 | 处理建议 |
|---|---|
| API Key 无效或未携带 | 检查 `Authorization: Bearer YOUR_API_KEY` 请求头 |
| 尚未绑定授权身份 | 先在 Create UI 授权书页面完成身份绑定 |
| 累计充值资格不足 | 达到个人或公司对应的资格要求后重试 |
| 未确认风险条款 | 将 `confirm_risk_terms` 设置为 `true` |
| 歌曲不可授权 | 查看歌曲列表返回的 `reason_code` 和 `reason` |
| 歌曲已签发授权书 | 使用返回的 `certificate_id` 查询已有授权书 |
| PDF 暂时无法生成 | 稍后重试；失败记录不会占用歌曲授权资格 |

## 注意事项

- 请使用歌曲列表返回的 `suno_song_id`，不要使用 `pending:*` 占位 ID 或任务表 ID。
- 下载地址不是公开链接，请勿移除 API Key 鉴权。
- 授权书记录属于 API Key 对应用户，不能跨用户查询或下载。
- 授权范围、限制条款及最终 PDF 内容以实际签发的授权书为准。
