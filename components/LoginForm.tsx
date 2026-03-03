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

  const waveBg = (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <svg
        className="absolute bottom-0 left-0 w-full h-[45%] animate-nagi-wave"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ filter: 'saturate(1.2) brightness(1.15)' }}
      >
        <path fill="#06b6d4" opacity="0.12" d="M0 40 Q 25 30 50 40 T 100 40 V 100 H 0 Z">
          <animate attributeName="d" dur="14s" repeatCount="indefinite"
            values="M0 40 Q 25 30 50 40 T 100 40 V 100 H 0 Z;
                    M0 40 Q 25 52 50 40 T 100 40 V 100 H 0 Z;
                    M0 40 Q 25 30 50 40 T 100 40 V 100 H 0 Z" />
        </path>
        <path fill="#3b82f6" opacity="0.10" d="M0 55 Q 25 65 50 55 T 100 55 V 100 H 0 Z">
          <animate attributeName="d" dur="9s" repeatCount="indefinite"
            values="M0 55 Q 25 65 50 55 T 100 55 V 100 H 0 Z;
                    M0 55 Q 25 45 50 55 T 100 55 V 100 H 0 Z;
                    M0 55 Q 25 65 50 55 T 100 55 V 100 H 0 Z" />
        </path>
        <path fill="#8b5cf6" opacity="0.08" d="M0 35 Q 25 20 50 35 T 100 35 V 100 H 0 Z">
          <animate attributeName="d" dur="20s" repeatCount="indefinite"
            values="M0 35 Q 25 20 50 35 T 100 35 V 100 H 0 Z;
                    M0 35 Q 25 48 50 35 T 100 35 V 100 H 0 Z;
                    M0 35 Q 25 20 50 35 T 100 35 V 100 H 0 Z" />
        </path>
      </svg>
    </div>
  );

  if (status === 'success') {
    return (
      <>
        {waveBg}
        <div className="flex items-center justify-center min-h-[70vh] text-center p-8 animate-in fade-in duration-700">
          <p className="text-gray-500 font-light">メール送ったよ。リンクから、そっと入ってね。</p>
        </div>
      </>
    );
  }

  return (
    <>
      {waveBg}
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-16">
        <div className="flex flex-col items-center gap-6 max-w-xs text-center">
          <h1 className="text-2xl font-light text-slate-600 tracking-widest">nagi</h1>
          <p className="text-xs text-slate-400 leading-relaxed font-light">
            スマホに触れていた時間を石、離れていた時間を波として映す、静かな記録帳。
          </p>
          <p className="text-[10px] text-slate-300 leading-relaxed font-light">
            通知も点数もありません。眺めたいときに、眺めてください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm mx-auto px-8">
          <div className="flex flex-col gap-2">
            <input
              type="email"
              placeholder="your email?"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-4 py-2 bg-transparent border-b border-gray-200 focus:border-gray-400 outline-none transition-colors text-center font-light tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="text-xs tracking-[0.2em] text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 lowercase"
          >
            {status === 'loading' ? 'sending...' : 'send link'}
          </button>
          {status === 'error' && (
            <p className="text-xs text-red-300 text-center font-light">
              あれ、うまくいかなかった。もう一回やってみて。
            </p>
          )}
          {status === 'rate-limited' && (
            <p className="text-xs text-red-300 text-center font-light">
              ちょっと送りすぎかも。また後でね。
            </p>
          )}
        </form>
      </div>
    </>
  );
}
