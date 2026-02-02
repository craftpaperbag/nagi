'use client';

import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="text-[10px] font-bold uppercase px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors min-w-[64px] text-slate-600"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
