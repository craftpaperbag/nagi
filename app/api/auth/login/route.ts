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
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px; text-align: center; color: #333;">
          <h2 style="font-weight: 200; letter-spacing: 0.2em; margin-bottom: 30px;">nagi</h2>
          <p style="font-size: 14px; color: #666; margin-bottom: 40px; line-height: 1.6;">
            ログインリクエストを受け付けました。<br>
            下のボタンをタップして、静かな時間へ戻りましょう。
          </p>
          <a href="${magicLink}" style="display: inline-block; background-color: #111; color: #fff; padding: 16px 32px; text-decoration: none; border-radius: 4px; font-size: 14px; letter-spacing: 0.1em; font-weight: 500;">
            ログインを完了する
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 40px;">
            このリンクの有効期限は10分間です。<br>
            心当たりのない場合は、このメールを無視してください。
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
