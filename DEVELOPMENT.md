# 開発メモ

## Redis

```bash
brew install redis
brew services start redis
```

## .env.local

```
KV_URL="redis://localhost:6379"
KV_REST_API_URL="http://localhost:6379"
KV_REST_API_TOKEN="aaaaaaaaaaaaaaaaaaaaaaa"
```

## ドライバ

### ログ記録 ※認証機能実装前

```bash
curl -X POST http://localhost:3000/api/log \
     -H "Content-Type: application/json" \
     -d '{"app": "app-name"}'
```
