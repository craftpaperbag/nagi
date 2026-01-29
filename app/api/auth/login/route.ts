import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { redisClient } from '@/lib/redis';
import { Ratelimit } from "@upstash/ratelimit";

const resend = new Resend(process.env.RESEND_API_KEY);

// Ratelimitのインスタンス化 (redisClientを再利用)
const ratelimit = new Ratelimit({
  redis: redisClient,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
});

export async function POST(request: Request) {
  try {
    // 0. Rate Limit (開発環境以外で適用)
    if (process.env.NODE_ENV !== 'development') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
      const { success } = await ratelimit.limit(ip);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again after an hour.' },
          { status: 429 }
        );
      }
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. トークン生成
    const token = uuidv4();
    const tokenKey = `auth_token:${token}`;

    // 2. Redisに保存 (TTL: 600秒)
    await redisClient.set(tokenKey, email, {
      ex: 600,
    });

    // 3. マジックリンクの構築
    const origin = new URL(request.url).origin;
    const magicLink = `${origin}/api/auth/callback?token=${token}`;

    // 現在時刻を取得 (重複回避が目的なので、秒まで含める)
    const timeString = new Date().toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 4. Resendでメール送信
    await resend.emails.send({
      from: 'nagi <onboarding@resend.dev>', // 運用に合わせて変更
      to: [email],
      subject: `nagi へのログイン (${timeString})`,
      html: `
        <p>nagi へのログインリクエストを受け付けました。</p>
        <p><a href="${magicLink}">こちらのリンク</a>をクリックしてログインを完了してください。</p>
        <p>このリンクの有効期限は10分間です。</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
