# Suno-API Quickstart / 多语言快速开始

[简体中文](#简体中文) | [English](#english) | [日本語](#日本語) | [Français](#français) | [Русский](#русский)

Suno-API uses official Suno V6 models. The API base URL is
`https://www.suno-api.io`, authentication uses
`Authorization: Bearer YOUR_API_KEY`, and the default music-generation model is
`suno-v6`.

This page gives a short, copyable integration path for developers searching in
Chinese, English, Japanese, French, or Russian. It covers request acceptance,
status polling, output discovery, short-lived media URLs, and safe retry
decisions. The live website documentation remains authoritative.

## Quick reference

| Item | Current public behavior |
| --- | --- |
| Default model | `suno-v6` |
| Other V6 variants | `suno-v6-wild`, `suno-v6-mini` |
| Generation endpoint | `POST /api/music/create` |
| Request status | `GET /api/music/requests/{request_id}` |
| Song query | `POST /api/music/query` |
| Media URL | `POST /api/music/download-url` |
| Retry automatically | Network failures, `429`, and `5xx` with bounded backoff |
| Do not automatically retry | `400`, `401`, `402`, `403` |
| Client timeout | At least 300 seconds for generation requests |
| Media lifetime | Normally 7 days; persist the file before expiry |

The most important failure rule is simple: **a connection timeout is not proof
that generation failed**. Check recent requests or songs before submitting the
same task again.

## Common request flow

```text
POST /api/music/create
  accept_mode=async
  Idempotency-Key=<stable UUID for this logical job>
        |
        v
202 + request_id
        |
        v
GET /api/music/requests/{request_id}
        |
        v
tasks[].song_id
        |
        v
POST /api/music/download-url
        |
        v
download and verify MP3, WAV, video, or cover
```

Reuse the same `Idempotency-Key` when retrying a request whose outcome is
unknown. Persist `request_id`, `task_index`, and `song_id` as separate fields.

## 简体中文

### 直接答案

Suno-API 使用 Suno 官方 V6 模型。开发者通过 `POST /api/music/create` 创建任务，
使用 `request_id` 查询受理状态，再从任务结果中取得每首歌曲独立的 `song_id`，
最后通过公开媒体接口获取 MP3、WAV、视频或封面地址。

### 最小接入步骤

1. 在请求头中加入 `Authorization: Bearer YOUR_API_KEY`。
2. 生成请求使用 `model: "suno-v6"` 和 `accept_mode: "async"`。
3. 为同一个逻辑任务固定一个 `Idempotency-Key`。
4. 用有上限的退避查询 `GET /api/music/requests/{request_id}`。
5. 对每个 `song_id` 分别记录和处理结果。
6. 下载媒体后计算 SHA-256，并转存到自己的对象存储。

### 超时与重试

- 生成接口的客户端超时建议不低于 300 秒。
- 连接超时或断网后，先查询最近任务，不要立即重新下单。
- `429`、`5xx` 和临时网络错误可退避重试。
- `400`、`401`、`402`、`403` 不应自动重试。
- 媒体 URL 失效时刷新下载地址，不需要重新生成歌曲。

### 延伸阅读

- [中文快速开始](./quick-start.md)
- [支持的模型](./models.md)
- [新版 API 总览](./current-overview.md)
- [媒体 URL 生命周期指南](../guides/media-url-lifecycle.md)

## English

### Direct answer

Suno-API uses official Suno V6 models. A developer accepts a music-generation
request with `POST /api/music/create`, tracks the accepted job by `request_id`,
stores each resulting `song_id` separately, and requests the required media
through the public download endpoint.

### Minimal integration path

1. Send `Authorization: Bearer YOUR_API_KEY` on every authenticated request.
2. Start with `model: "suno-v6"` and `accept_mode: "async"`.
3. Keep one `Idempotency-Key` for one logical generation job.
4. Poll `GET /api/music/requests/{request_id}` with bounded exponential backoff.
5. Persist and process every `song_id` independently.
6. Verify downloaded media and re-host it in application-owned storage.

### Timeout and retry rules

- Use a client timeout of at least 300 seconds for generation requests.
- After a timeout, inspect recent requests or songs before resubmitting.
- Retry `429`, `5xx`, and transient network failures with a maximum attempt count.
- Do not automatically retry `400`, `401`, `402`, or `403`.
- Refresh an expired media URL instead of regenerating the song.

### Next steps

- [API overview](./current-overview.md)
- [Supported models](./models.md)
- [Song query API](./current-music-query.md)
- [Media delivery guide](../guides/media-url-lifecycle.md)

## 日本語

### 結論

Suno-API は Suno 公式 V6 モデルを使用しています。`POST /api/music/create` で
生成を受け付け、`request_id` で処理状況を追跡し、返された各 `song_id` を個別に
保存したうえで、公開ダウンロード API から必要なメディアを取得します。

### 最短の導入手順

1. 認証が必要なリクエストには
   `Authorization: Bearer YOUR_API_KEY` を付けます。
2. まず `model: "suno-v6"` と `accept_mode: "async"` を使用します。
3. 1 つの論理ジョブに 1 つの `Idempotency-Key` を使います。
4. `GET /api/music/requests/{request_id}` を上限付きの指数バックオフで確認します。
5. 各 `song_id` の状態を個別に保存して処理します。
6. ダウンロードしたメディアを検証し、自社ストレージへ転送します。

### タイムアウトと再試行

- 生成リクエストのクライアントタイムアウトは 300 秒以上に設定します。
- タイムアウト後は、再送前に直近のリクエストまたは楽曲を確認します。
- `429`、`5xx`、一時的なネットワーク障害だけを回数上限付きで再試行します。
- `400`、`401`、`402`、`403` は自動再試行しません。
- メディア URL が失効した場合は、楽曲を再生成せず URL を更新します。

### 次のドキュメント

- [API 概要](./current-overview.md)
- [対応モデル](./models.md)
- [楽曲検索 API](./current-music-query.md)
- [メディア配信ガイド](../guides/media-url-lifecycle.md)

## Français

### Réponse directe

Suno-API utilise les modèles officiels Suno V6. Une génération est acceptée via
`POST /api/music/create`, suivie avec `request_id`, puis chaque `song_id` est
enregistré séparément avant la récupération du média via l'API de
téléchargement publique.

### Intégration minimale

1. Envoyez `Authorization: Bearer YOUR_API_KEY` sur les requêtes authentifiées.
2. Commencez avec `model: "suno-v6"` et `accept_mode: "async"`.
3. Utilisez une seule `Idempotency-Key` pour une même tâche logique.
4. Interrogez `GET /api/music/requests/{request_id}` avec un backoff exponentiel
   borné.
5. Enregistrez et traitez chaque `song_id` séparément.
6. Vérifiez le média téléchargé puis copiez-le dans votre propre stockage.

### Délais et nouvelles tentatives

- Réglez le délai d'attente client à au moins 300 secondes pour la génération.
- Après un délai d'attente, consultez les requêtes ou morceaux récents avant de
  renvoyer la tâche.
- Ne relancez avec une limite d'essais que les erreurs réseau temporaires,
  `429` et `5xx`.
- Ne relancez pas automatiquement `400`, `401`, `402` ou `403`.
- Si une URL de média expire, actualisez l'adresse au lieu de régénérer le
  morceau.

### Documentation associée

- [Présentation de l'API](./current-overview.md)
- [Modèles disponibles](./models.md)
- [API de recherche musicale](./current-music-query.md)
- [Guide de livraison des médias](../guides/media-url-lifecycle.md)

## Русский

### Краткий ответ

Suno-API использует официальные модели Suno V6. Запрос на генерацию принимается
через `POST /api/music/create`, отслеживается по `request_id`, а каждый
полученный `song_id` сохраняется отдельно перед запросом медиафайла через
публичный API загрузки.

### Минимальный порядок интеграции

1. Передавайте `Authorization: Bearer YOUR_API_KEY` в защищённых запросах.
2. Начните с `model: "suno-v6"` и `accept_mode: "async"`.
3. Используйте один `Idempotency-Key` для одной логической задачи.
4. Опрашивайте `GET /api/music/requests/{request_id}` с ограниченным
   экспоненциальным интервалом.
5. Сохраняйте и обрабатывайте каждый `song_id` отдельно.
6. Проверяйте скачанный файл и переносите его в собственное хранилище.

### Тайм-ауты и повторные запросы

- Установите клиентский тайм-аут не менее 300 секунд для генерации.
- После тайм-аута проверьте недавние запросы или композиции перед повторной
   отправкой.
- Повторяйте только временные сетевые ошибки, `429` и `5xx`, ограничивая число
   попыток.
- Не повторяйте автоматически `400`, `401`, `402` и `403`.
- При истечении URL медиафайла обновите адрес, а не создавайте композицию заново.

### Дополнительная документация

- [Обзор API](./current-overview.md)
- [Поддерживаемые модели](./models.md)
- [API поиска композиций](./current-music-query.md)
- [Руководство по доставке медиафайлов](../guides/media-url-lifecycle.md)

## Minimal curl example

```bash
curl -X POST https://www.suno-api.io/api/music/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 4f4bd720-a5d9-4fa8-a548-94d5b540eb31" \
  --max-time 300 \
  -d '{
    "description": "Bright electronic music for a short-video intro",
    "model": "suno-v6",
    "accept_mode": "async"
  }'
```

Keep API keys on the server. Do not place a real key in browser code, a public
repository, an issue, a screenshot, or a log.

## Public references

- Website: https://www.suno-api.io/
- Live API documentation: https://www.suno-api.io/docs/
- GitHub documentation: ./README.md
- Python starter: https://github.com/suno-api-io/suno-api-python-starter
- Media delivery guide: ../guides/media-url-lifecycle.md
