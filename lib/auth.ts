import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { redisClient } from './redis'; // redisClient をインポート

/**
 * 新規セッションIDを生成します。
 * UUID v4 を使用します。
 * @returns 生成されたセッションID
 */
export async function generateSessionId(): Promise<string> {
  const sessionId = uuidv4();
  // UUIDの衝突確率は非常に低いため、ここでは重複チェックは省略します。
  // 必要であれば、RedisのSETNXコマンドなどで重複チェックを追加することも可能です。
  return sessionId;
}

/**
 * 指定されたセッションIDをHTTPレスポンスのCookieに設定します。
 * @param response - Cookieを設定するNextResponseオブジェクト
 * @param sessionId - 設定するセッションID
 */
export function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set({
    name: 'session_id',
    value: sessionId,
    httpOnly: true, // JavaScriptからアクセスできないようにする
    secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみで送信
    sameSite: 'lax', // CSRF攻撃を防ぐための設定
    maxAge: 30 * 24 * 60 * 60, // 有効期限: 30日 (秒単位)
    path: '/', // 全てのパスでCookieを有効にする
  });
}
