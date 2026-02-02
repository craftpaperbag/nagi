# DESIGN.md

> **AIへの指示 (HIERARCHY PROTOCOL):**
> 1.  **上位概念の優先:** 本ドキュメント (`DESIGN.md`) は、`CORE.md` の下位に位置する実装詳細である。
> 2.  **哲学の参照:** デザインのトーン、UIの挙動、テキストのニュアンスについては、必ず `CORE.md` の定義（Origin Emotion, Texture & Metaphor等）を参照し、それに準拠すること。
> 3.  **矛盾の解決:** 万が一、本ドキュメントと `CORE.md` の間に矛盾を感じた場合は、`CORE.md` の哲学を優先するか、ユーザーに確認を求めること。

## 1. プロダクトスコープ
**定義:** `CORE.md` で定義された「自責からの解放」を実現するための、デジタル・ウェルビーイングWebアプリケーション + iOSショートカット。

* **Core Logic:** ユーザーの「アプリ利用ログ」をバックグラウンドで収集し、それを「石（拘束）」と「波（解放）」のメタファーで可視化する。
* **Key Constraint:** `CORE.md` の "Zero Friction" に従い、ユーザー操作を極限まで排除する。

## 2. ユーザー体験 (UX) フロー

### A. 認証 & セットアップ (Magic Setup)
1.  **ログイン:**
    * メールアドレス入力のみ。パスワードレス (Magic Link)。
2.  **連携 (Handshake):**
    * Web画面上の「連携ボタン」をタップ。
    * iOSショートカットが起動し、Webから受け取ったAPIキーをiCloud Drive上の設定ファイルに保存。
    * ユーザーによるキーのコピペ作業は排除する。

### B. 日常の記録 (Silent Recording)
1.  **バックグラウンド処理:**
    * iOSショートカット (Automation) がアプリの開閉を検知。
    * APIを叩き、現在の「アプリ名」を送信する。
2.  **ユーザー操作:** なし（完全自動）。

### C. 振り返り (Reflection)
1.  **可視化:**
    * Webダッシュボード、または日次メール（任意）でタイムラインを確認。
    * "Stone vs Wave" のロジックで1日をレンダリングする。

## 3. 技術スタック
* **Framework:** Next.js (App Router) / TypeScript
* **Database:** Upstash Redis (@upstash/redis) - KVS/Stream型
* **Auth:** Custom Magic Link (JWT or Session Cookie)
* **Email:** Resend
* **Infrastructure:** Vercel
* **Client Integration:** iOS Shortcuts (Web Hook + iCloud File)

## 4. データ構造 (Redis Schema)

### A. 認証・ユーザー
* `auth_token:{uuid}` -> `{email}` (TTL: 600s)
* `user:email:{email}` -> `{user_id}`
* `user:{user_id}` -> JSON (Profile & API Key)
* `session:{session_id}` -> `{user_id}` (TTL: 30days)
* `api_token:{api_token}` -> `{user_id}` (Lookup用)

### B. ログデータ (Stream)
事実（アプリ名）のみを時系列で保持する。
* `logs:{user_id}:{YYYY-MM-DD}` (List)
    * Value: `{"ts": 1701501200000, "app": "Instagram", "is_dummy": boolean}`
    * Note: `app` が空文字の場合は「ホーム画面/ロック解除」を意味する。
    * Note: `is_dummy` は開発環境用フラグ。本番表示からは除外する。

### C. アプリ管理
* `apps:{user_id}` (Set) -> `["Instagram", "X", ...]`

## 5. API仕様

### POST `/api/log`
* **Auth:** Bearer Token (HeaderからPrefix除去して検証)
* **Body:** `{"app": "TargetAppName"}`
* **Logic:**
    1.  Token検証。
    2.  Redis ListへPush (タイムスタンプはServer側で付与推奨、またはClient側と同期)。
    3.  Redis Setへアプリ名を追加。

### POST `/api/auth/login`
* **Body:** `{"email": "..."}`
* **Logic:** Token生成 -> Redis保存 -> Resend送信。

### GET `/api/auth/callback`
* **Query:** `?token=...`
* **Logic:** Token検証 -> Session生成 -> Cookieセット (HttpOnly, Secure, Lax) -> リダイレクト。

### POST `/api/auth/logout`
* **Logic:** Cookieの `session_id` を削除し、トップページへリダイレクト。

## 6. フロントエンド描画ロジック
`CORE.md` の "Texture & Metaphor" を以下のロジックで実装する。

* **入力:** 1日のログリスト
* **ユーザー設定:** 「ターゲットアプリ（例: Instagram）」を選択。
* **レンダリング判定:**
    * **Stone Mode (拘束):** ログ `app` がターゲットアプリと一致している期間。
        * 表現: 無機質、硬いグレー、動かない。
    * **Wave Mode (解放):** それ以外の期間。
        * 表現: 有機的で輝きのある色彩、不規則なリズムのアニメーション。複数の波を異なる周期（12s, 7s, 19s等）と大きく異なる振幅で重ねる。彩度を高めたシアン、ブルー、バイオレットをブレンドし、光が透き通るような「輝き」と、予測できない「自由な時間」を表現する。
        * インタラクション: 波の領域をクリックすると、水面を横から見たような楕円形の波紋が波の内部に広がる。このエフェクトは波のシルエットでクリッピングされ、水中の光の拡散のような視覚体験を与えることで、心理的な「解放感」を強調する。
        * ツールチップ: ホバー時にその日の合計時間を表示。Stoneは重厚なダークトーン、Waveは軽やかなライトトーンで対比させる。
    * **補正:** 一定時間（例: 15分）ログがない場合は、デバイスに触れていないとみなし「Wave」とする。

## 7. 画面設計 (UI Components)

### 共通事項
* **Design System:** `CORE.md` の "Unobtrusive" に従う。装飾排除、余白重視。

### 1. Login View
* 要素: メール入力フォームのみ。
* 状態: Loading / Sent / Error。

### 2. Dashboard View (Protected)
* **Header:** 挨拶（小文字、控えめに）、ログアウト。
* **Setup Status:** 以下の2ステップを表示（設定完了後は控えめな表示に切り替え）。
    1.  **Step 1 (Install):** ショートカット配布用URL (`SHORTCUT_URL`) へのリンク/QR。
    2.  **Step 2 (Connect):** 連携用URLスキーム (`shortcuts://...`) へのリンクボタン。
* **Timeline:** 日付選択 + Stone/Wave Visualization。

## 8. セキュリティ & 制限
* **Rate Limiting:**
    * `@upstash/ratelimit` を使用。
    * ログインAPI等にIP制限 (5 req/hour) をかける。
    * `NODE_ENV === 'development'` の場合は制限をスキップする。
* **Data Privacy:** ログデータはユーザー自身のみが閲覧可能とする。

## 9. iOSショートカット仕様
* **保存パス:** iCloud Drive上の `Shortcuts/nagi-cli-v0.1-api-key.txt`
* **配布用:** `SHORTCUT_URL` (Env)
* **連携用:** `RUN_SHORTCUT_URL` (Env) ※イメージ：`shortcuts://run-shortcut?name=nagi` ※実行時に、後ろに`&input={API_KEY}`をつける。
* **動作フロー:**
    1.  Input有無チェック。
    2.  Inputあり -> 指定パスに書き込み（初期設定完了通知）。
    3.  Inputなし -> 指定パスから読み込み -> エラーなら通知、成功なら API送信。
