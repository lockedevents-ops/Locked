"use client";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SignInFormSimple } from "@/components/forms/SignInFormSimple";


interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: 'lock' | 'ticket' | 'vote' | 'book' | 'register' | 'merch';
  returnUrl?: string;
}

export function SignInModal({ isOpen, onClose, action = 'lock', returnUrl }: SignInModalProps) {
  // Handle Escape key to close modal and lock body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Lock body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        // Restore body scroll when modal closes
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let heading = 'Sign in Required';
  let message = '';
  switch (action) {
    case 'lock':
      heading = 'Sign in to Lock Events';
      message = 'You need to be signed in to lock (bookmark) events.';
      break;
    case 'book':
      heading = 'Sign in to Book Venues';
      message = 'You need to be signed in to book venues.';
      break;
    case 'ticket':
      heading = 'Sign in to Get Tickets';
      message = 'You need to be signed in to purchase or get tickets for this event.';
      break;
    case 'vote':
      heading = 'Sign in to Vote';
      message = 'You need to be signed in to vote for contestants.';
      break;
    case 'register':
      heading = 'Sign in to Register';
      message = 'You need to be signed in to register for this event.';
      break;
    case 'merch':
      heading = 'Sign in to Shop';
      message = 'Please sign in to add items to your cart or purchase merchandise.';
      break;
    default:
      heading = 'Sign in Required';
      message = 'You need to be signed in to perform this action.';
  }

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" 
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 h-8 w-8 bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </Button>
        
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">{heading}</h2>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
          
          <SignInFormSimple returnUrl={returnUrl} onSuccess={onClose} />
        </div>
      </div>
    </div>
  );
}
