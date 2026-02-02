'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function DatePicker({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    // クエリパラメータを更新してページを再読み込み
    // scroll: false を指定して、ページトップへの自動スクロールを防ぐ
    router.push(`${pathname}?date=${date}`, { scroll: false });
  };

  return (
    <input 
      type="date" 
      name="date" 
      defaultValue={defaultValue}
      onChange={handleChange}
      className="text-sm px-2 py-1 outline-none bg-transparent cursor-pointer"
    />
  );
}
