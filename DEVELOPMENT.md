# 開発メモ

## 環境変数

```
REDIS_URL
VERCEL_OIDC_TOKEN
RESEND_API_KEY ※手動設定
```

## ドライバ

### ログ記録 ※認証機能実装前

```bash
curl -X POST http://localhost:3000/api/log \
    -H "Authorization: Bearer YOUR_API_KEY_HERE" \
    -H "Content-Type: application/json" \
    -d '{"app": "Instagram"}'
```
