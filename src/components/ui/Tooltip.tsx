"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'right' | 'top' | 'bottom' | 'left';
  delay?: number;
  disabled?: boolean;
}

export function Tooltip({ 
  content, 
  children, 
  position = 'right', 
  delay = 0,
  disabled = false 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

      switch (position) {
        case 'right':
          setCoords({
            top: rect.top + rect.height / 2,
            left: rect.right + 12
          });
          break;
        case 'top':
          setCoords({
            top: rect.top - 10,
            left: rect.left + rect.width / 2
          });
          break;
        case 'bottom':
          setCoords({
            top: rect.bottom + 10,
            left: rect.left + rect.width / 2
          });
          break;
        case 'left':
          setCoords({
            top: rect.top + rect.height / 2,
            left: rect.left - 12
          });
          break;
      }
    }
  };

  useEffect(() => {
    if (isVisible) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isVisible]);

  const renderTooltip = () => {
    if (!mounted) return null;

    const isVertical = position === 'right' || position === 'left';
    const centerOffset = isVertical ? { y: '-50%' } : { x: '-50%' };

    return createPortal(
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: 0.5,
              x: position === 'right' ? -20 : position === 'left' ? 20 : (centerOffset.x || 0), 
              y: position === 'top' ? 20 : position === 'bottom' ? -20 : (centerOffset.y || 0)
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              x: isVertical ? 0 : '-50%', 
              y: isVertical ? '-50%' : 0 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.5,
              transition: { duration: 0.1 }
            }}
            transition={{ 
              type: "spring",
              damping: 12,
              stiffness: 300,
              mass: 0.6,
              delay 
            }}
            style={{ 
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              zIndex: 99999,
              pointerEvents: 'none',
              transform: isVertical ? 'translateY(-50%) translateZ(0)' : 'translateX(-50%) translateZ(0)',
              backfaceVisibility: 'hidden',
              WebkitFontSmoothing: 'antialiased'
            }}
            className="px-3 py-1.5 bg-neutral-900 border border-white/10 text-white text-[11px] font-bold rounded-lg shadow-2xl whitespace-nowrap will-change-transform"
          >
            {content}
            {/* Arrow */}
            <div 
              className={`absolute w-1.5 h-1.5 bg-neutral-900 border-white/10 rotate-45 ${
                position === 'right' ? 'left-[-3px] top-1/2 -translate-y-1/2 border-l border-b' :
                position === 'top' ? 'bottom-[-3px] left-1/2 -translate-x-1/2 border-r border-b' :
                position === 'bottom' ? 'top-[-3px] left-1/2 -translate-x-1/2 border-l border-t' :
                'right-[-3px] top-1/2 -translate-y-1/2 border-r border-t'
              }`} 
            />
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  if (disabled) return <>{children}</>;

  return (
    <div 
      ref={triggerRef}
      className="inline-flex w-full h-full"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {renderTooltip()}
    </div>
  );
}
