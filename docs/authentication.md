# Suno API Key 获取与认证说明

## API 密钥

Suno API Key 是调用本平台所有接口的凭证。Suno-API 使用 API 密钥（API Key）进行身份验证，所有 API 请求都需要在 HTTP 请求头中携带它。

## 获取 API 密钥

1. 访问 [https://www.suno-api.io](https://www.suno-api.io)
2. 注册或登录您的账号
3. 进入控制台页面
4. 点击「创建新密钥」按钮
5. 为密钥设置一个名称（可选）
6. 复制生成的 API 密钥

**重要提示**:
- API 密钥只在创建时显示一次，请妥善保管
- 如果丢失密钥，需要重新创建
- 每个账号可以创建多个 API 密钥

## 使用 API 密钥

### 请求头格式

在所有 API 请求中，需要在 HTTP 请求头中包含以下信息：

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### 示例

> **等待时间与超时（重要）**：下面的示例调用的是生成接口 `POST /api/music/create`，它是**同步接口**，要点如下：
>
> - **响应返回时才代表订单已被受理并提交生成**，受理前不会有任何中间响应，也没有别的接口能查到这一单。
> - 实测等待：多数请求 1–3 秒返回，约 10% 超过 30 秒，最长约 230 秒。
> - **请把客户端超时设置为 300 秒以上**（下面各语言示例已带上对应的超时设置）。
> - **未收到响应不等于没有生成。** 超时后请勿立即重试，否则会重复下单、重复扣费；连接中断可稍后用 `GET /api/music/songs` 确认。
>
> 完整说明见[新版 API 总览](current-overview.md)的「等待时间与超时设置」。

#### cURL

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 300 \
  -d '{
    "description": "一首轻快的流行歌曲"
  }'
```

#### Python

```python
import requests

headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.post(
    "https://www.suno-api.io/api/music/create",
    json={"description": "一首轻快的流行歌曲"},
    headers=headers,
    timeout=300
)
```

#### Node.js

```javascript
const axios = require('axios');

const headers = {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
};

const response = await axios.post(
  'https://www.suno-api.io/api/music/create',
  { description: '一首轻快的流行歌曲' },
  { headers, timeout: 300000 }
);
```

#### PHP

```php
<?php
$headers = [
    "Authorization: Bearer YOUR_API_KEY",
    "Content-Type: application/json"
];

$ch = curl_init("https://www.suno-api.io/api/music/create");
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "description" => "一首轻快的流行歌曲"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 300);

$response = curl_exec($ch);
curl_close($ch);
?>
```

## 认证错误

### 401 Unauthorized

**原因**:
- API 密钥缺失
- API 密钥格式错误
- API 密钥无效或已被删除

**错误响应示例**:
```json
{
  "success": false,
  "message": "无效的 API 密钥",
  "error_code": "INVALID_API_KEY"
}
```

**解决方案**:
1. 检查请求头中是否包含 `Authorization` 字段
2. 确认格式为 `Bearer YOUR_API_KEY`（注意 Bearer 后有空格）
3. 确认 API 密钥是否正确
4. 如果密钥已删除，请创建新密钥

### 403 Forbidden

**原因**:
- API 密钥已被禁用
- 账号已被暂停

**错误响应示例**:
```json
{
  "success": false,
  "message": "API 密钥已被禁用",
  "error_code": "API_KEY_DISABLED"
}
```

**解决方案**:
- 联系技术支持了解详情
- 检查账号状态

## 安全最佳实践

### 1. 保护您的 API 密钥

**不要**:
- ❌ 在前端代码中暴露 API 密钥
- ❌ 将 API 密钥提交到 Git 仓库
- ❌ 在公开的地方分享 API 密钥
- ❌ 在日志中记录 API 密钥

**应该**:
- ✅ 将 API 密钥存储在环境变量中
- ✅ 在后端服务器中调用 API
- ✅ 使用配置文件（不提交到版本控制）
- ✅ 定期轮换 API 密钥

### 2. 环境变量配置

#### Linux/Mac

```bash
# 在 ~/.bashrc 或 ~/.zshrc 中添加
export SUNO_API_KEY="YOUR_API_KEY"

# 在代码中使用
import os
api_key = os.environ.get('SUNO_API_KEY')
```

#### Windows

```cmd
# 设置环境变量
setx SUNO_API_KEY "YOUR_API_KEY"

# 在代码中使用
import os
api_key = os.environ.get('SUNO_API_KEY')
```

#### .env 文件（推荐）

```bash
# .env 文件
SUNO_API_KEY=YOUR_API_KEY

# 添加到 .gitignore
echo ".env" >> .gitignore
```

```python
# Python 使用 python-dotenv
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.environ.get('SUNO_API_KEY')
```

```javascript
// Node.js 使用 dotenv
require('dotenv').config();
const apiKey = process.env.SUNO_API_KEY;
```

### 3. 密钥管理

**创建多个密钥**:
- 为不同的应用或环境创建不同的密钥
- 开发环境和生产环境使用不同的密钥
- 便于追踪和管理

**定期轮换**:
- 建议每 3-6 个月更换一次密钥
- 如果怀疑密钥泄露，立即更换

**删除不用的密钥**:
- 及时删除不再使用的密钥
- 减少安全风险

## 速率限制

为了保证服务质量，API 有以下速率限制：

| 限制类型 | 限制值 | 说明 |
|---------|--------|------|
| 每秒请求数 | 10 次 | 单个 API 密钥每秒最多 10 次请求 |
| 每分钟请求数 | 100 次 | 单个 API 密钥每分钟最多 100 次请求 |
| 并发生成任务 | 5 个 | 同时进行的音乐生成任务不超过 5 个 |

### 429 Too Many Requests

**错误响应示例**:
```json
{
  "success": false,
  "message": "请求过于频繁，请稍后再试",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

**解决方案**:
- 降低请求频率
- 实现请求队列
- 使用指数退避重试策略
- 等待 `retry_after` 秒后重试

### 重试策略示例

下面是一个保守的重试实现。两点必须注意：生成类接口要设置足够长的超时（300 秒以上）；**超时（`ReadTimeout` / `ConnectTimeout`）不要重试** —— 订单可能已经受理并正在生成，重试会重复下单、重复扣费，请先查询确认。

```python
import time
import requests

def api_request_with_retry(url, data, max_retries=3, timeout=300):
    """带重试的 API 请求（只对明确的失败响应重试）"""
    for attempt in range(max_retries):
        try:
            # 生成类接口是同步接口，超时至少要给到 300 秒
            response = requests.post(url, json=data, headers=headers, timeout=timeout)

            if response.status_code == 429:
                # 速率限制，等待后重试
                retry_after = response.json().get('retry_after', 60)
                print(f"速率限制，等待 {retry_after} 秒...")
                time.sleep(retry_after)
                continue

            response.raise_for_status()
            return response.json()

        except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectTimeout) as e:
            # 生成类接口超时后不要重试：这一单可能已经受理并正在生成。
            # 请先用 GET /api/music/songs 确认，确认没有再重新提交。
            raise TimeoutError(
                "请求超时。该订单可能已经受理，请先用 GET /api/music/songs 确认后再决定是否重新提交。"
            ) from e

        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise
            # 指数退避
            wait_time = 2 ** attempt
            print(f"请求失败，{wait_time} 秒后重试...")
            time.sleep(wait_time)

    raise Exception("达到最大重试次数")
```

## 常见问题

### Q: API 密钥的格式是什么？

A: API 密钥以 `sk-` 开头，后跟一串字母和数字，总长度约 50-60 个字符。

### Q: 可以在前端直接调用 API 吗？

A: 不建议。这会暴露您的 API 密钥。应该在后端服务器中调用 API，前端通过您的后端接口间接使用。

### Q: 如何知道我的 API 密钥是否有效？

A: 发起任何 API 请求，如果返回 401 错误，说明密钥无效。

### Q: 忘记 API 密钥怎么办？

A: API 密钥只在创建时显示一次。如果忘记，需要删除旧密钥并创建新密钥。

### Q: 一个账号可以创建多少个 API 密钥？

A: 没有数量限制，但建议合理管理，及时删除不用的密钥。

### Q: API 密钥会过期吗？

A: 不会自动过期，除非您手动删除或账号被暂停。

### Q: 如何监控 API 使用情况？

A: 登录控制台，可以查看每个 API 密钥的使用统计，包括请求次数、消费金额等。

## 相关链接

- [快速开始指南](./quick-start.md)
- [API 文档首页](./README.md)
- [控制台](https://www.suno-api.io/console)
