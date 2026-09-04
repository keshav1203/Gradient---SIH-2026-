import React from 'react';
import { usePortal } from '../../context/PortalContext';

export const Toast: React.FC = () => {
  const { toastMessage } = usePortal();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 animate-bounce">
      <div className="bg-primary text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-outline-variant/30 max-w-sm">
        <span className="material-symbols-outlined text-[#BDE9FF] text-[20px]">
          check_circle
        </span>
        <span className="text-sm font-medium">{toastMessage}</span>
      </div>
    </div>
  );
};
