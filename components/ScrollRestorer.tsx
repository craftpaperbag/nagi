'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function ScrollRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 保存された位置があれば復元
    const scrollPos = sessionStorage.getItem('scrollPos');
    if (scrollPos) {
      window.scrollTo(0, parseInt(scrollPos, 10));
    }

    // スクロール位置を保存
    const handleScroll = () => {
      sessionStorage.setItem('scrollPos', window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname, searchParams]);

  return null;
}
