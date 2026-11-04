# 账户余额查询 API

## 接口说明

账户余额查询用于让用户通过自己的 API Key 查询 New API 账户余额。该接口只查询余额，不会触发生成任务，也不会扣费。

**接口地址**: `GET /api/user/balance`

**计费**: 免费。

**余额单位**: `yuan`。接口中 `effective_amount` 已按 `quota_per_unit` 换算为用户可理解的元金额。


## 请求参数

### Headers

| 参数名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Authorization | string | 是 | Bearer YOUR_API_KEY |

### Query 参数

无。

## 请求示例

### cURL

```bash
curl -X GET https://www.suno-api.io/api/user/balance \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Python

```python
import requests

api_key = "YOUR_API_KEY"
response = requests.get(
    "https://www.suno-api.io/api/user/balance",
    headers={"Authorization": f"Bearer {api_key}"},
    timeout=30,
)
response.raise_for_status()

result = response.json()
balance = result["data"]["balance"]
print(balance["formatted_effective_amount"])
```

### Node.js

```javascript
const apiKey = "YOUR_API_KEY";

const response = await fetch("https://www.suno-api.io/api/user/balance", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}

const result = await response.json();
console.log(result.data.balance.formatted_effective_amount);
```

### PHP

```php
<?php
$apiKey = "YOUR_API_KEY";

$ch = curl_init("https://www.suno-api.io/api/user/balance");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . $apiKey
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
if ($response === false) {
    throw new Exception(curl_error($ch));
}
curl_close($ch);

$result = json_decode($response, true);
echo $result["data"]["balance"]["formatted_effective_amount"];
?>
```

## 响应结果

```json
{
  "success": true,
  "message": "",
  "data": {
    "object": "user_balance",
    "user": {
      "id": 123,
      "username": "example",
      "quota": 207900000,
      "used_quota": 0,
      "request_count": 10,
      "group": "default",
      "status": 1
    },
    "token": {
      "id": 456,
      "name": "default",
      "group": "default",
      "status": 1,
      "remain_quota": 207900000,
      "used_quota": 0,
      "unlimited_quota": true,
      "model_limits_enabled": false,
      "model_limits": {}
    },
    "balance": {
      "user_quota": 207900000,
      "token_quota": 207900000,
      "effective_quota": 207900000,
      "user_amount": 415.8,
      "token_amount": 415.8,
      "effective_amount": 415.8,
      "amount_unit": "yuan",
      "formatted_effective_amount": "415.80 yuan"
    },
    "display": {
      "quota_per_unit": 500000,
      "amount_unit": "yuan"
    }
  }
}
```

## 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `balance.user_quota` | number | 用户账户剩余额度原始值 |
| `balance.token_quota` | number | 当前 API Key 剩余额度原始值；无限额度 key 按用户余额返回 |
| `balance.effective_quota` | number | 当前 API Key 实际可用额度原始值 |
| `balance.effective_amount` | number | 已换算后的实际可用金额 |
| `balance.amount_unit` | string | 固定为 `yuan` |
| `balance.formatted_effective_amount` | string | 可直接展示给用户看的余额字符串 |
| `display.quota_per_unit` | number | 原始额度换算单位，金额 = quota / quota_per_unit |

## 说明

- 本接口使用的 API Key 和生成接口相同。
- 当 API Key 余额耗尽时，仍允许查询余额。
- 禁用或过期的 API Key 不能查询。
- 接口不返回 USD、CNY、`$` 或 `¥`，统一使用 `yuan`，避免用户理解偏差。
