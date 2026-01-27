import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { redisClient } from '@/lib/redis'; // 名前付きインポートに変更

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. トークン生成
    const token = uuidv4();
    const tokenKey = `auth_token:${token}`;

    // 2. Redisに保存 (TTL: 600秒)
    await redisClient.set(tokenKey, email, {
      EX: 600,
    });

    // 3. マジックリンクの構築
    const origin = new URL(request.url).origin;
    const magicLink = `${origin}/api/auth/callback?token=${token}`;

    // 4. Resendでメール送信
    await resend.emails.send({
      from: 'nagi <onboarding@resend.dev>', // 運用に合わせて変更
      to: [email],
      subject: 'nagi へのログイン',
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
