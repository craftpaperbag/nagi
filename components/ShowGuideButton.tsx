'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

interface ShowGuideButtonProps {
  userId: string;
  updateSetupStatus: (formData: FormData) => Promise<void>;
}

export default function ShowGuideButton({ userId, updateSetupStatus }: ShowGuideButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = async () => {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('status', 'false');

    startTransition(async () => {
      await updateSetupStatus(formData);
      router.push('/');
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full transition-colors font-medium disabled:opacity-50"
    >
      {isPending ? '読み込み中...' : 'ガイドを再表示する'}
    </button>
  );
}
