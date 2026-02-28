'use client';

import { useState } from 'react';
import SetupCompleteModal from './SetupCompleteModal';

interface SetupCompleteButtonProps {
  userId: string;
  updateSetupStatus: (formData: FormData) => Promise<void>;
}

export default function SetupCompleteButton({ userId, updateSetupStatus }: SetupCompleteButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConfirm = async () => {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('status', 'true');
    await updateSetupStatus(formData);
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-slate-900 text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
      >
        設定が完了した
      </button>
      <SetupCompleteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
