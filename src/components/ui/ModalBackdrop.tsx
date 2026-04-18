// Centralized modal backdrop with consistent blur and color
import React from 'react';

export function ModalBackdrop({ onClick, className = "", children }: {
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
      onClick={onClick}
      aria-modal="true"
      role="dialog"
    >
      {children}
    </div>
  );
}
