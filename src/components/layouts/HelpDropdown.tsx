"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export function HelpDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };
  
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300); // 300ms delay before closing
  };

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div 
      className="relative" 
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Help link with animated chevron icon */}
      <div className="flex items-center gap-1 text-sm text-white hover:text-accent cursor-pointer py-2">
        Help
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 bg-black rounded-lg shadow-lg py-2 z-50 border border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Guides Section */}
          <div className="px-4 py-2">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Guides</span>
            <ul className="mt-2 space-y-1">
              <li>
                <Link 
                  href="/pages/guides/booking" 
                  className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                >
                  Event Booking
                </Link>
              </li>
              <li>
                <Link 
                  href="/pages/guides/hosting" 
                  className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                >
                  Event Hosting
                </Link>
              </li>
              <li>
                <Link 
                  href="/pages/guides/voting" 
                  className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                >
                  Voting Guide
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="border-t border-neutral-800 my-1"></div>
          
          {/* Support Section */}
          <div className="px-4 py-2">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Support</span>
            <ul className="mt-2 space-y-1">
              <li>
                <Link 
                  href="/pages/help/faqs" 
                  className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link 
                  href="/pages/help/contact" 
                  className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/pages/help/account" 
                  className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                >
                  Account Help
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
