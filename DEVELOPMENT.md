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
