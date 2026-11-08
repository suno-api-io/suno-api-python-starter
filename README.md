# Suno-API Python Starter

[简体中文](#简体中文) | [English](#english) | [日本語](#日本語) | [Français](#français) | [Русский](#русский)

👤 [GitHub Profile](https://github.com/suno-api-io) | 📚 [公开接口文档 / Public API documentation](./docs/README.md)

🟢 [Node.js Starter](./examples/node/README.md)

🧭 [媒体交付指南 / Media delivery guide](./guides/media-url-lifecycle.md)

## License

- Source code and runnable examples: MIT License (`LICENSE`).
- Documentation under `docs/`: CC BY 4.0 (`LICENSE-DOCS.txt`).
- The website is the authoritative documentation version.
- Trademarks, logos and third-party materials are excluded as described in
  `NOTICE.md`.

## 简体中文

一个用于演示 AI 音乐生成任务状态机的最小 Python 示例。

Suno-API 使用 Suno 官方 V6 模型。

- 官网：https://www.suno-api.io/
- 在线创作：https://www.suno-api.io/create/
- API 文档：https://www.suno-api.io/docs/

### 这个示例解决什么

很多接入问题来自业务代码混用了不同的 ID、状态和重试策略。本示例演示：

- 使用 `Idempotency-Key` 防止重复受理；
- 区分 `request_id`、任务序号和 `song_id`；
- 使用异步受理与有界轮询；
- 分别处理每首歌曲的状态；
- 处理短期媒体 URL 和下载交付。

### 安装与运行

前置条件：Python 3.10+ 和 Suno-API Key。

```bash
python -m venv .venv
```

Windows：

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:SUNO_API_KEY = "YOUR_API_KEY"
python sample.py "一首适合短视频开场的明亮电子音乐"
```

macOS / Linux：

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
export SUNO_API_KEY="YOUR_API_KEY"
python sample.py "一首适合短视频开场的明亮电子音乐"
```

不要把 API Key 写入代码或提交到 Git。

### 请求流程

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

### 关键规则

1. 网络重试必须复用同一个 `Idempotency-Key`。
2. 同步请求超时后，先查询订单，再决定是否补发。
3. 只对 429 和 5xx 自动等待；400、401、402、403 不做自动重试。
4. 两首结果分别保存、分别处理。
5. 媒体地址默认 7 天有效；生产系统应在到期前转存。

### 推荐阅读

- 快速开始：https://www.suno-api.io/docs/quick-start/
- API 总览：https://www.suno-api.io/docs/current-overview/
- 音乐生成：https://www.suno-api.io/docs/current-music-create/
- 歌曲查询：https://www.suno-api.io/docs/current-music-query/
- 媒体下载：https://www.suno-api.io/docs/current-music-media-download/

## English

A minimal Python example that treats AI music generation as a task state machine.

Suno-API uses official Suno V6 models.

- Website: https://www.suno-api.io/
- Create music: https://www.suno-api.io/create/
- API documentation: https://www.suno-api.io/docs/

### What this example demonstrates

- idempotency keys for safe retries;
- explicit separation of `request_id`, task index, and `song_id`;
- asynchronous acceptance and bounded polling;
- separate state handling for each generated song;
- short-lived media URLs and delivery checks.

### Install and run

Requirements: Python 3.10+ and a Suno-API key.

```bash
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:SUNO_API_KEY = "YOUR_API_KEY"
python sample.py "Bright electronic music for a short-video intro"
```

macOS / Linux:

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
export SUNO_API_KEY="YOUR_API_KEY"
python sample.py "Bright electronic music for a short-video intro"
```

Never put an API key in source code or commit it to Git.

### Request flow

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

### Key rules

1. Reuse the same `Idempotency-Key` for network retries.
2. After a synchronous timeout, query recent orders before resubmitting.
3. Automatically retry only 429 and 5xx responses; do not retry 400, 401, 402, or 403.
4. Persist and process the state of each generated song separately.
5. Media URLs normally expire after 7 days; re-host media before expiry.

### Documentation

- Quick start: https://www.suno-api.io/docs/quick-start/
- API overview: https://www.suno-api.io/docs/current-overview/
- Music generation: https://www.suno-api.io/docs/current-music-create/
- Song lookup: https://www.suno-api.io/docs/current-music-query/
- Media download: https://www.suno-api.io/docs/current-music-media-download/

## 日本語

AI 音楽生成をタスク状態機械として扱うための最小限の Python サンプルです。

Suno-API は Suno 公式 V6 モデルを使用しています。

- ウェブサイト：https://www.suno-api.io/
- 楽曲作成：https://www.suno-api.io/create/
- API ドキュメント：https://www.suno-api.io/docs/

### このサンプルで確認できること

- 安全な再試行のための `Idempotency-Key`；
- `request_id`、タスク番号、`song_id` の明確な分離；
- 非同期受付と上限付きポーリング；
- 生成された楽曲ごとの状態管理；
- 短期間有効なメディア URL と配信処理。

### インストールと実行

必要なもの：Python 3.10 以上と Suno-API キー。

```bash
python -m venv .venv
```

Windows：

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:SUNO_API_KEY = "YOUR_API_KEY"
python sample.py "ショート動画の冒頭向けの明るいエレクトロニック音楽"
```

macOS / Linux：

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
export SUNO_API_KEY="YOUR_API_KEY"
python sample.py "ショート動画の冒頭向けの明るいエレクトロニック音楽"
```

API キーをソースコードへ書いたり、Git にコミットしたりしないでください。

### リクエストフロー

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

### 重要なルール

1. ネットワーク再試行では同じ `Idempotency-Key` を使用します。
2. 同期リクエストがタイムアウトした場合は、再送前に注文履歴を確認します。
3. 自動再試行は 429 と 5xx のみとし、400、401、402、403 は再試行しません。
4. 生成された楽曲ごとに状態を保存し、個別に処理します。
5. メディア URL は通常 7 日間有効です。期限前に自分のストレージへ保存してください。

### ドキュメント

- クイックスタート：https://www.suno-api.io/docs/quick-start/
- API 概要：https://www.suno-api.io/docs/current-overview/
- 楽曲生成：https://www.suno-api.io/docs/current-music-create/
- 楽曲検索：https://www.suno-api.io/docs/current-music-query/
- メディアダウンロード：https://www.suno-api.io/docs/current-music-media-download/

## Français

Un exemple Python minimal qui traite la génération musicale par IA comme une machine à états.

Suno-API utilise les modèles officiels Suno V6.

- Site web : https://www.suno-api.io/
- Création musicale : https://www.suno-api.io/create/
- Documentation API : https://www.suno-api.io/docs/

### Ce que démontre cet exemple

- des clés d'idempotence pour des nouvelles tentatives sûres ;
- une séparation explicite entre `request_id`, l'index de tâche et `song_id` ;
- une acceptation asynchrone et une interrogation limitée ;
- un suivi d'état distinct pour chaque morceau généré ;
- la gestion des URL de média temporaires et de leur livraison.

### Installation et exécution

Prérequis : Python 3.10+ et une clé Suno-API.

```bash
python -m venv .venv
```

Windows :

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:SUNO_API_KEY = "YOUR_API_KEY"
python sample.py "Musique électronique lumineuse pour l'introduction d'une vidéo courte"
```

macOS / Linux :

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
export SUNO_API_KEY="YOUR_API_KEY"
python sample.py "Musique électronique lumineuse pour l'introduction d'une vidéo courte"
```

Ne placez jamais une clé API dans le code source et ne la validez pas dans Git.

### Flux de requête

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

### Règles essentielles

1. Réutilisez la même `Idempotency-Key` lors des nouvelles tentatives réseau.
2. Après un délai d'attente synchrone, consultez les commandes récentes avant tout nouvel envoi.
3. Ne relancez automatiquement que les réponses 429 et 5xx ; ne relancez pas les réponses 400, 401, 402 ou 403.
4. Enregistrez et traitez chaque morceau généré séparément.
5. Les URL de média expirent normalement après 7 jours ; copiez les fichiers avant expiration.

### Documentation

- Démarrage rapide : https://www.suno-api.io/docs/quick-start/
- Présentation de l'API : https://www.suno-api.io/docs/current-overview/
- Génération musicale : https://www.suno-api.io/docs/current-music-create/
- Recherche de morceaux : https://www.suno-api.io/docs/current-music-query/
- Téléchargement des médias : https://www.suno-api.io/docs/current-music-media-download/

## Русский

Минимальный пример на Python, который рассматривает генерацию музыки с помощью ИИ как конечный автомат задачи.

Suno-API использует официальные модели Suno V6.

- Сайт: https://www.suno-api.io/
- Создание музыки: https://www.suno-api.io/create/
- Документация API: https://www.suno-api.io/docs/

### Что демонстрирует пример

- ключи идемпотентности для безопасных повторных запросов;
- явное разделение `request_id`, индекса задачи и `song_id`;
- асинхронный приём запросов и ограниченный опрос статуса;
- раздельное управление состоянием каждой созданной композиции;
- работу с краткосрочными URL медиафайлов и их доставку.

### Установка и запуск

Требования: Python 3.10+ и ключ Suno-API.

```bash
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:SUNO_API_KEY = "YOUR_API_KEY"
python sample.py "Яркая электронная музыка для начала короткого видео"
```

macOS / Linux:

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
export SUNO_API_KEY="YOUR_API_KEY"
python sample.py "Яркая электронная музыка для начала короткого видео"
```

Никогда не добавляйте ключ API в исходный код и не коммитьте его в Git.

### Поток запросов

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

### Основные правила

1. При повторных сетевых запросах используйте тот же `Idempotency-Key`.
2. После тайм-аута синхронного запроса проверьте историю заказов, прежде чем отправлять запрос снова.
3. Автоматически повторяйте только запросы после ответов 429 и 5xx; не повторяйте 400, 401, 402 и 403.
4. Сохраняйте и обрабатывайте каждую созданную композицию отдельно.
5. URL медиафайлов обычно действуют 7 дней; сохраняйте файлы в собственное хранилище до истечения срока.

### Документация

- Быстрый старт: https://www.suno-api.io/docs/quick-start/
- Обзор API: https://www.suno-api.io/docs/current-overview/
- Генерация музыки: https://www.suno-api.io/docs/current-music-create/
- Поиск композиций: https://www.suno-api.io/docs/current-music-query/
- Загрузка медиафайлов: https://www.suno-api.io/docs/current-music-media-download/
