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
2.  **データ記録:**
    * iOSショートカット（Automation）を利用。
    * アプリを開いた時・閉じた時に、バックグラウンドで現在の「アプリ名」だけをサーバーに送信する。
    * ユーザーの操作は不要。
3.  **振り返り (Daily Summary):**
    * 1日の終わりにメールでサマリーが届く（任意）。
    * リンクを開くとタイムラインが表示される。
    * **可視化のロジック:**
        * 見たい「ターゲットアプリ（例: Instagram）」を選択する。
        * そのアプリを開いている時間は「石のように硬いグレーの帯」で表現。
        * それ以外の時間は「パステルの優しい波のアニメーション」で表現。
        * 「自分がいかにスマホに囚われていたか」と「いつ自由だったか」を直感的に伝える。

## 3. 技術スタック
* **Framework:** Next.js (App Router) / TypeScript
* **Database:** Vercel KV (Redis based)
* **Auth:** Custom Magic Link Auth (JWT or Session ID via Cookies)
* **Email:** Resend
* **Hosting:** Vercel
* **Client:** iOS Shortcuts (Web Hook)

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
    * Value: `{ "id": "...", "email": "...", "created_at": "..." }`
* **Session (Browser)**
    * Key: `session:{session_id}`
    * Value: `{user_id}`
    * TTL: 30日

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
    * Key: `logs:{user_id}:{YYYY-MM-DD}`
    * Type: List (RPUSH)
    * Value (JSON): `{"ts": 1701501200, "app": "Instagram"}`
    * TTL: 必要に応じて設定（例: 1年）

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
    * ※ セキュリティ強化のためURLパラメータ渡しは廃止。
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
    2.  ユーザー特定（存在しなければ新規作成し、同時にAPIキーも生成）。
    3.  セッションID (UUID) 生成＆KV保存。
    4.  **Cookie設定:** `HttpOnly`, `Secure`, `SameSite=Lax`。
    5.  ダッシュボードへリダイレクト。

## 6. フロントエンド描画ロジック (Timeline)
* サーバーから「その日の全ログリスト」を取得。
* ユーザーが選択した「ターゲットアプリ（A）」に基づいてレンダリング。
    * ログ `app: A` 到着 → **「石（拘束）」モード開始**
    * ログ `app: B` 到着 (A以外) → **「石」終了、「波（自由）」モード開始**
    * ※ 一定時間（例: 15分）ログがない場合は自動で「波」とみなす等の補正を行う。
