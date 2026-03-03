'use client';

export default function ScrollToTopLink() {
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="text-sm font-light text-slate-400 tracking-widest hover:text-slate-600 transition-colors"
    >
      nagi
    </button>
  );
}
