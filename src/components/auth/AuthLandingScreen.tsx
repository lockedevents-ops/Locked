"use client";

import React from 'react';
import Image from 'next/image';
import { Mail } from 'lucide-react';

interface MobileAuthScreenProps {
  onGoogleClick: () => void;
  onFacebookClick: () => void;
  onEmailClick: () => void;
}

export function MobileAuthScreen({ onGoogleClick, onFacebookClick, onEmailClick }: MobileAuthScreenProps) {
  return (
    <div className="fixed inset-0 bg-[#0f111a] flex flex-col items-center justify-between px-8 py-12 text-white overflow-hidden md:hidden z-50">
      {/* Background Decorative Patterns */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none select-none">
        {/* Circle/O */}
        <div className="absolute top-[35%] left-[5%] -rotate-12 scale-150">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="50" cy="50" r="40" />
          </svg>
        </div>
        
        {/* X / Cross */}
        <div className="absolute top-[25%] left-[30%] rotate-45">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="10" y1="30" x2="50" y2="30" />
            <line x1="30" y1="10" x2="30" y2="50" />
          </svg>
        </div>
        
        {/* Triangle */}
        <div className="absolute top-[45%] left-[45%] rotate-[35deg]">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 5 L35 32 L5 32 Z" />
          </svg>
        </div>
        
        {/* Wavy Line */}
        <div className="absolute top-[40%] right-[10%] rotate-[-20deg]">
          <svg width="80" height="40" viewBox="0 0 80 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 20 Q 25 5, 40 20 T 70 20" />
          </svg>
        </div>
        
        {/* Star */}
        <div className="absolute bottom-[45%] right-[20%] scale-125">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="30" y1="10" x2="30" y2="50" />
            <line x1="10" y1="30" x2="50" y2="30" />
            <line x1="16" y1="16" x2="44" y2="44" />
            <line x1="44" y1="16" x2="16" y2="44" />
          </svg>
        </div>
        
        {/* Large Circle Outline */}
        <div className="absolute -bottom-20 -right-20 opacity-20 scale-[2]">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="100" cy="100" r="90" />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center mt-16 w-full max-w-sm">
        <div className="h-16 w-16 mb-10 relative animate-in fade-in zoom-in duration-700">
          <Image 
            src="/logo.png" 
            alt="Locked Logo" 
            fill 
            className="object-contain" 
            priority
          />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-center tracking-tight mb-8 animate-in slide-in-from-bottom-4 duration-700 delay-100">
          Welcome<br />to Locked
        </h1>
        
        <div className="space-y-1 text-center text-neutral-400 font-medium text-lg animate-in slide-in-from-bottom-4 duration-700 delay-200">
          <p>Made for experiences.</p>
          <p>Designed for you.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 w-full max-w-sm space-y-4 mb-6 animate-in slide-in-from-bottom-8 duration-700 delay-300">
        <button 
          onClick={onGoogleClick}
          className="w-full h-[60px] bg-white text-black rounded-full flex items-center justify-center gap-3 font-semibold text-lg hover:bg-neutral-100 active:scale-95 transition-all shadow-lg"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <button 
          onClick={onFacebookClick}
          className="w-full h-[60px] bg-[#1877F2] text-white rounded-full flex items-center justify-center gap-3 font-semibold text-lg hover:bg-[#166fe5] active:scale-95 transition-all shadow-lg"
        >
          <FacebookIcon />
          Continue with Facebook
        </button>

        <button 
          onClick={onEmailClick}
          className="w-full h-[60px] bg-[#222533] text-white rounded-full flex items-center justify-center gap-3 font-semibold text-lg hover:bg-[#2c2f40] active:scale-95 transition-all shadow-lg border border-white/5"
        >
          <Mail className="w-6 h-6" />
          Continue with email
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.248h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
