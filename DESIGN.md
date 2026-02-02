# Project Design Document: nagi (凪)

## 1. プロダクト概要
**コンセプト:** あなたを自由にする、静かなデジタル・ウェルビーイングアプリ。
**目的:** ユーザーのスマホ依存を解消し、人生の時間を取り戻す。
**コアバリュー:**
* **No Gamification:** 目標、実績、バッジ、通知は一切なし。
* **No Friction:** 認知負荷を最小限に。心理的リアクタンス（強制への反発）を生まない。
* **Privacy & Peace:** 広告なし、SNS連携なし、静かに寄り添うデザイン。

## 2. ユーザー体験 (UX)
1.  **ログイン:**
    * メールアドレスのみで登録・ログイン完了（Magic Link）。
    * パスワードは存在しない。
2.  **初期セットアップ (Magic Setup):**
    * ユーザーはショートカットをインストール後、Web画面の「連携」ボタンをタップするだけ。
    * Webアプリがショートカットを自動起動し、APIキーを裏側で渡して保存させる。
    * 面倒なコピペ作業は不要。
3.  **データ記録:**
    * iOSショートカット（Automation）を利用。
    * アプリを開いた時・閉じた時に、バックグラウンドで現在の「アプリ名」だけをサーバーに送信する。
    * ユーザーの操作は不要。
4.  **振り返り (Daily Summary):**
    * 1日の終わりにメールでサマリーが届く（任意）。
    * リンクを開くとタイムラインが表示される。
    * **可視化のロジック:**
        * 見たい「ターゲットアプリ（例: Instagram）」を選択する。
        * そのアプリを開いている時間は「石のように硬いグレーの帯」で表現。
        * それ以外の時間は「パステルの優しい波のアニメーション」で表現。
        * 「自分がいかにスマホに囚われていたか」と「いつ自由だったか」を直感的に伝える。

## 3. 技術スタック
* **Framework:** Next.js (App Router) / TypeScript
* **Database:** Upstash Redis (@upstash/redis)
* **Auth:** Custom Magic Link Auth (JWT or Session ID via Cookies)
* **Email:** Resend
* **Hosting:** Vercel
* **Client:** iOS Shortcuts (Web Hook + iCloudファイル)
    * **Shortcut Distribution:** 
        * 配布用URL: 環境変数 (`SHORTCUT_URL`) で管理。
        * 実行/設定用URL: 環境変数 (`RUN_SHORTCUT_URL`) で管理。実行時にAPIキーを `input` パラメータとして付与し、ショートカット内での初期設定を完了させる。

## 4. データ構造 (Redis Schema)
RDBではなくKVSを採用し、時系列データ（Stream）として管理する。

### A. 認証・ユーザー管理
* **Magic Link Token (Login Request)**
    * Key: `auth_token:{random_uuid}`
    * Value: `{email}`
    * TTL: 600秒 (10分)
* **User Mapping**
    * Key: `user:email:{email}`
    * Value: `{user_id}`
* **User Profile**
    * Key: `user:{user_id}`
    * Value: `{ "id": "...", "email": "...", "api_token": "...", "created_at": "..." }`
* **Session**
    * Key: `session:{session_id}`
    * Value: `{user_id}`
    * TTL: 30日
* **API Token**
    * Key: `api_token:{api_token}`
    * Value: `{user_id}`

### B. APIキー (iOS Shortcut用)
ブラウザのセッションとは別に、ショートカット用の永続的な認証キーを発行する。
* **API Key Lookup**
    * Key: `api_key:{random_uuid_key}`
    * Value: `{user_id}`
    * 用途: APIリクエスト時の認証高速化。
* **User's API Key**
    * Key: `user:{user_id}:api_key`
    * Value: `{random_uuid_key}`
    * 用途: ダッシュボードでのキー表示・再生成用。

### C. ログデータ (Core)
「開いた/閉じた」の状態は持たず、事実（アプリ名）のみを時系列リストで保持する。

* **Timeline Logs**
    * Key: `logs:{user_id}:{YYYY-MM-DD}` (日付は Asia/Tokyo 基準)
    * Type: List (RPUSH)
    * Value (JSON): `{"ts": 1701501200000, "app": "Instagram"}` (tsはミリ秒)
    * TTL: 1年 (31,536,000秒)

### D. アプリ一覧 (Suggestion)
ユーザーが過去に使用したアプリ名のユニークリスト。

* **App List**
    * Key: `apps:{user_id}`
    * Type: Set (SADD)
    * Value: `["Instagram", "X", "YouTube", ...]`

## 5. API設計

### POST `/api/log`
iOSショートカットから叩かれるエンドポイント。
* **Headers:** `Authorization: Bearer <API_KEY>`
* **Body:** `{"app": "Instagram"}`
* **Logic:**
    1.  Headerからトークンを取得し、`Bearer ` プレフィックスを除去。
    2.  KV `api_key:{token}` を検索し、`user_id` を特定（存在しない場合は 401 Unauthorized）。
    3.  `logs:{user_id}:{today}` に `{ts: now, app: body.app}` をPush。
    4.  `apps:{user_id}` に `body.app` をAdd。
    5.  Response: 200 OK (Empty)

### POST `/api/auth/login`
* **Body:** `{"email": "..."}`
* **Logic:**
    1.  UUID生成。
    2.  KVに保存 (TTL 10分)。
    3.  Resendでマジックリンク送信。

### GET `/api/auth/callback`
* **Query:** `?token=...`
* **Logic:**
    1.  KVからトークン検証＆削除。
    2.  ユーザー特定（存在しなければ新規作成、APIトークンも生成）。
    3.  セッションID (UUID) 生成＆KV保存。
    4.  **Cookie設定:** `HttpOnly`, `Secure`, `SameSite=Lax`。
    5.  ダッシュボードへリダイレクト。

### POST `/api/auth/logout`
* **Logic:**
    1. Cookieの `session_id` を削除。
    2. トップページへリダイレクト。

## 6. フロントエンド描画ロジック (Timeline)
* サーバーから「その日の全ログリスト」を取得。
* ユーザーが選択した「ターゲットアプリ（A）」に基づいてレンダリング。
    * ログ `app: A` 到着 → **「石（拘束）」モード開始**
    * ログ `app: B` 到着 (A以外) → **「石」終了、「波（自由）」モード開始**
    * ※ 一定時間（例: 15分）ログがない場合は自動で「波」とみなす等の補正を行う。

## 7. 画面設計

### ログイン画面 (`/`)
- **コンポーネント:** `components/LoginForm.tsx`
- **機能:**
    -   メールアドレス入力フィールドを表示する。
    -   入力されたメールアドレスを `/api/auth/login` へPOSTする。
    -   ローディング状態、成功状態、エラー状態を管理する。
- **状態管理:** `useState` を使用して、メールアドレス、ローディング状態を管理する。
- **API連携:** `fetch` API を使用して `/api/auth/login` と通信する。

### ログ一覧画面 (`/`) ※認証後

- **コンポーネント:** `app/page.tsx`
- **機能:**
    -   ログイン状態を判定し、表示を切り替える。
    -   **ログイン前:** `LoginForm` を表示する。
    -   **ログイン後:**
        -   ヘッダーに「やあ、{email}」という挨拶と「ログアウト」ボタンを表示する。
        -   **iOSショートカット設定セクション:**
            -   **ステップ1 (インストール):** 環境変数 `SHORTCUT_URL` をそのままQRコード/ボタンとして表示。
            -   **ステップ2 (初期設定):** 環境変数 `RUN_SHORTCUT_URL` に、ユーザーのAPIキーを `input` パラメータとして付加したURLを生成し、QRコード/ボタンとして表示。
        -   日付選択UIを表示し、選択された日付のログを取得・表示する。
        -   ログがない場合は、「ログはありません」というメッセージを表示する。
- **データ取得:** `lib/redis.ts` の `redisClient` (Upstash Redis SDK) を使用して、Redisからセッション情報、ユーザー情報、ログデータを取得する。
- **表示ロジック:**
    -   セッションCookie (`session_id`) の有無でログイン状態を判定する。
    -   ログイン状態に応じて、`LoginForm` またはログ表示エリアを表示する。
    -   ログは `LogEntry` インターフェースに従って表示される。
    -   ログのタイムスタンプは、Redisから取得したUnixタイムスタンプ（ミリ秒）を元にローカルタイムで表示する。

## 8. セキュリティ (Rate Limiting)
不正な利用やスパムを防止するため、特定のAPIエンドポイントにレート制限を導入する。

### A. ログインAPI (`/api/auth/login`)
* **Identifier:** IPアドレス
* **制限:** 1時間あたり5回まで (Sliding Window方式)
* **開発環境:** 開発効率を優先し、`NODE_ENV === 'development'` の場合は制限をスキップする。
* **実装:** `@upstash/ratelimit` を使用。

## 9. iOSショートカット設計

Webからキーを受け取り、ローカルに保存するロジックを実装する。

### ショートカットの処理フロー
1.  **入力チェック:** `Shortcut Input`（外部からの入力）があるか確認。
    * **ある場合 (セットアップモード):**
        * 入力を「APIキー」として、iCloud Drive上の `nagi/config.txt` に保存（上書き）。
        * 「設定が完了しました」と通知を出して終了。
    * **ない場合 (通常ログモード):**
        * iCloud Driveの `nagi/config.txt` からAPIキーを読み込む。
        * ファイルがない場合は「設定が必要です」と通知して終了。
        * API `/api/log` に `Authorization: Bearer {読み込んだキー}` を付けてリクエスト送信。

### Web側の連携ボタン実装
* **Action:** 以下のURLスキームを叩くリンクを設置。
    * `shortcuts://run-shortcut?name=nagi&input={USER_API_KEY}`
    * ※ `name=nagi` は配布するショートカット名と一致させる。
