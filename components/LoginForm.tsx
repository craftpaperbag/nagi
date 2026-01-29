'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'rate-limited'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
      } else if (res.status === 429) {
        setStatus('rate-limited');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center p-8 animate-in fade-in duration-700">
        <p className="text-gray-500 font-light">メール送ったよ！届いたリンクから、そっとログインしてね。</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm mx-auto p-8">
      <div className="flex flex-col gap-2">
        <input
          type="email"
          placeholder="email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="px-4 py-2 bg-transparent border-b border-gray-200 focus:border-gray-400 outline-none transition-colors text-center font-light tracking-wider"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="text-xs tracking-[0.2em] text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 uppercase"
      >
        {status === 'loading' ? 'Sending...' : 'Get Magic Link'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-300 text-center font-light">
          なんかうまくいかなかったみたい。もう一回試してみてね。
        </p>
      )}
      {status === 'rate-limited' && (
        <p className="text-xs text-red-300 text-center font-light">
          リクエストが多すぎるみたい。1時間後くらいにまた試してみてね。
        </p>
      )}
    </form>
  );
}
