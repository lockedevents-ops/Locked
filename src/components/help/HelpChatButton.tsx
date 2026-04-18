"use client";

import { useState, useEffect, useRef } from 'react';
import { Headset } from 'lucide-react';
import { HelpChatPanel } from './HelpChatPanel';

export function HelpChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState<{x:number,y:number}>({ x: 0, y: 0 });
  const [side, setSide] = useState<'left' | 'right'>('right');
  const [isMobile, setIsMobile] = useState(false);
  const startRef = useRef<{x:number,y:number,clientX:number,clientY:number}|null>(null);
  const hydratedRef = useRef(false);

  // Use site-wide default container horizontal padding (px-4 => 16px) for edge & bottom spacing
  const CONTAINER_PADDING = 16; // aligns with `px-4`
  const STORAGE_KEY = 'helpChatButtonPos';

  const openChat = () => setIsOpen(true);

  const persist = (next: { side: 'left'|'right'; y: number }) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };


  // Initialize position on mount
  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    updateIsMobile();
    const init = () => {
      const btn = 48; // size
      const margin = CONTAINER_PADDING;
      const bottom = CONTAINER_PADDING;
      // default baseline (bottom-right)
      let defaultY = window.innerHeight - btn - bottom;
      let defaultSide: 'left'|'right' = 'right';
      // attempt hydrate from storage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && (saved.side === 'left' || saved.side === 'right')) {
            defaultSide = saved.side;
            if (typeof saved.y === 'number') defaultY = saved.y;
          }
        }
      } catch {}
      // clamp Y within viewport
      const yMax = window.innerHeight - btn - bottom;
      const y = Math.min(Math.max(margin, defaultY), yMax);
      setSide(defaultSide);
      setPos({ x: defaultSide === 'left' ? margin : window.innerWidth - btn - margin, y });
      hydratedRef.current = true;
    };
    init();
    const onResize = () => {
      updateIsMobile();
      const margin = CONTAINER_PADDING;
      const bottom = CONTAINER_PADDING;
      setPos(p => {
        const btn = 48;
        let x = p.x;
        // keep snapped side alignment
        x = side === 'left' ? margin : window.innerWidth - btn - margin;
        let y = Math.min(Math.max(margin, p.y), window.innerHeight - btn - bottom);
        if (hydratedRef.current) persist({ side, y });
        return { x, y };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (isOpen) return;
    startRef.current = { x: pos.x, y: pos.y, clientX: e.clientX, clientY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.clientX;
    const dy = e.clientY - startRef.current.clientY;
    if (!dragging && Math.hypot(dx, dy) > 6) setDragging(true);
    if (!dragging && Math.hypot(dx, dy) <= 6) return;
  const btnSize = 48;
  const edgeMargin = CONTAINER_PADDING;
  const bottomMargin = CONTAINER_PADDING;
    const newX = Math.min(Math.max(0, startRef.current.x + dx), window.innerWidth - btnSize); // full travel then snap
    const newY = Math.min(Math.max(edgeMargin, startRef.current.y + dy), window.innerHeight - btnSize - bottomMargin);
    setPos({ x: newX, y: newY });
  };

  const onPointerUp = () => {
    if (!startRef.current) return;
    const wasDragging = dragging;
    startRef.current = null;
    setDragging(false);
    // Snap horizontally only (left or right edge) with unified margin
    setPos(p => {
      const btnSize = 48;
      const margin = CONTAINER_PADDING;
      const snapLeft = p.x < (window.innerWidth - btnSize) / 2;
      const nextSide = snapLeft ? 'left' : 'right';
      setSide(nextSide);
      const nextPos = { x: snapLeft ? margin : window.innerWidth - btnSize - margin, y: p.y };
      persist({ side: nextSide, y: nextPos.y });
      return nextPos;
    });
    if (!wasDragging) openChat(); // treat as click if not dragged
  };

  const onPointerCancel = () => {
    startRef.current = null;
    setDragging(false);
  };

  return (
    <>
      {isOpen && isMobile && (
        <div className="fixed inset-0 z-30 backdrop-blur-sm bg-black/10 md:hidden pointer-events-none transition-opacity" aria-hidden />
      )}

      {!isOpen && (
        <div
          className={`fixed z-40 flex flex-col ${side === 'left' ? 'items-start' : 'items-end'} gap-2 select-none`}
          style={(() => {
            const margin = CONTAINER_PADDING;
            const extraHaloOffset = 4; // small extra spacing so glow / scale doesn't kiss edge
            const transition = dragging ? 'none' : 'left .25s, right .25s, top .25s';
            if (dragging || side === 'left') {
              return { top: pos.y, left: pos.x, right: 'auto', transition } as React.CSSProperties;
            }
            // snapped right: ignore stored left and use right anchor so scale/halo never overflow viewport
            return { top: pos.y, left: 'auto', right: margin + extraHaloOffset, transition } as React.CSSProperties;
          })()}
        >
          <button
            aria-label="Open help chat"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClick={() => {
              if (dragging || isOpen) return;
              openChat();
            }}
            className={`relative chat-button cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full group ${dragging ? 'scale-105' : ''}`}
          >
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 active:scale-95">
              <Headset className="w-5 h-5 wiggle-icon" />
            </div>
          </button>
        </div>
      )}

  <HelpChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} anchorSide={side} />

      <style jsx global>{`
        @keyframes fade-in { from { opacity:0; transform: translateY(4px);} to { opacity:1; transform: translateY(0);} }
        .animate-fade-in { animation: fade-in .5s ease forwards; }
        .chat-button { transition: transform .35s cubic-bezier(.16,.8,.24,1); touch-action: none; }
        .chat-button:hover { transform: translateY(-3px) rotate(-3deg); }
        .chat-button:active { transform: translateY(0) scale(.94); }
        .chat-button::after { content:''; position:absolute; inset:0; border-radius:9999px; box-shadow:0 0 0 0 rgba(99,102,241,0.3); opacity:0; transition: box-shadow .6s ease, opacity .4s ease; pointer-events:none; }
        .chat-button:hover::after { opacity:1; box-shadow:0 0 0 6px rgba(99,102,241,0.18), 0 0 0 12px rgba(99,102,241,0.1); }
        @keyframes wiggle { 0%,100%{transform:rotate(0deg);}25%{transform:rotate(12deg);}50%{transform:rotate(-10deg);}75%{transform:rotate(8deg);} }
        .chat-button:hover .wiggle-icon { animation: wiggle .6s ease-in-out; }
      `}</style>
    </>
  );
}