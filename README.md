# nagi

スマホの利用時間を静かに可視化するデジタルウェルビーイングアプリ。

iOSショートカットがバックグラウンドで利用ログを記録し、ダッシュボードが「石（スクリーンタイム）」と「波（自由時間）」として時間を映し出す。

> このプロダクトのコアとなる思想・哲学は [CORE.md](./CORE.md) に記載しています。

## 技術スタック

- **Next.js 16** (App Router) / React 19 / TypeScript (strict)
- **Tailwind CSS v4**
- **Upstash Redis** — 唯一のデータストア（セッション、ユーザー、ログ、アプリセット）
- **Resend** — Magic Link認証用メール送信
- **Vercel** にデプロイ

## 前提条件

- Node.js 18+
- Vercel アカウント + Upstash Redis インスタンス
- Resend API キー
- iOS ショートカットアプリでオートメーションを登録

## セットアップ

```bash
npm install
cp .env.local.example .env.local  # 環境変数を設定
npm run dev                        # http://localhost:3000
```

### 環境変数（`.env.local`）

| 変数 | 必須 | 説明 |
|------|------|------|
| `REDIS_URL` | ○ | Upstash Redis 接続URL |
| `VERCEL_OIDC_TOKEN` | ○ | Vercel認証トークン |
| `RESEND_API_KEY` | ○ | Resend APIキー |
| `SHORTCUT_URL` | — | iOSショートカットURL |
| `RUN_SHORTCUT_URL` | — | ショートカット実行URL |
| `NEXT_PUBLIC_BASE_URL` | — | アプリのベースURL |

## アーキテクチャ

```
iOS Shortcut → POST /api/log (Bearer token) → Upstash Redis
                                                    ↓
                              Dashboard (/) ← Server Component が直接取得
```

- **シングルページ構成**: すべてのUIは `/` に集約。URLクエリパラメータ（`?date=`, `?settings=`, `?large=`）で表示状態を制御
- **Server Components + Server Actions**: `page.tsx` が Redis から直接フェッチし、ミューテーションも Server Actions として定義
- **認証**: Magic Link（パスワードレス）。メール → Redis に UUID トークン保存（TTL 600秒）→ コールバックで検証 → HttpOnly Cookie セッション（30日）

## コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
npm run lint     # ESLint
```

## ログ送信テスト（開発用）

```bash
curl -X POST http://localhost:3000/api/log \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"app": "Instagram"}'
```

## ライセンス

Private
