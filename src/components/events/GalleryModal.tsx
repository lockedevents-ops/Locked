"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from '@/components/ui/AppImage';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  X, 
  ChevronLeft, 
  ChevronRight,
  Download,
  ZoomIn,
  Expand
} from 'lucide-react';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  selectedIndex: number;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.8
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.8
  })
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export function GalleryModal({ isOpen, onClose, images, selectedIndex = 0 }: GalleryModalProps) {
  const [[page, direction], setPage] = useState([selectedIndex, 0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // We simply use 'page' as the index, but wrap it to stay in bounds
  const imageIndex = Math.abs(page % images.length);
  const currentImage = images[imageIndex];

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setPage([selectedIndex, 0]);
      setIsZoomed(false);
      setIsLoading(true);
    }
  }, [isOpen, selectedIndex]);

  // Handle controls auto-hide
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isZoomed) setShowControls(false);
    }, 4000);
  }, [isZoomed]);

  useEffect(() => {
    if (isOpen) {
      resetControlsTimeout();
      window.addEventListener('mousemove', resetControlsTimeout);
      window.addEventListener('touchstart', resetControlsTimeout);
      return () => {
        window.removeEventListener('mousemove', resetControlsTimeout);
        window.removeEventListener('touchstart', resetControlsTimeout);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
    }
  }, [isOpen, resetControlsTimeout]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          paginate(-1);
          break;
        case 'ArrowRight':
          paginate(1);
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, page, images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
    setIsLoading(true);
    setIsZoomed(false);
  };

  const getSafeImageUrl = (image: string) => {
    if (!image) return '/events/default-image.jpg';
    return typeof image === 'string' ?
      (image.startsWith('http') || image.startsWith('/') ? image : `/events/${image}`) 
      : '/events/default-image.jpg';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode='wait'>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden"
        onClick={onClose}
      >
        {/* Top Bar */}
        <motion.div 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: showControls ? 0 : -100, opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
        >
          <div className="text-white/90 font-medium tracking-wide text-sm md:text-base pointer-events-auto bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
            {imageIndex + 1} / {images.length}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <ControlButton 
              onClick={() => setIsZoomed(!isZoomed)}
              icon={isZoomed ? <Expand className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
              label="Zoom"
            />
            <ControlButton 
              onClick={() => {
                const link = document.createElement('a');
                link.href = getSafeImageUrl(currentImage);
                link.download = `image-${imageIndex + 1}.jpg`;
                link.click();
              }}
              icon={<Download className="w-5 h-5" />}
              label="Download"
            />
            <div className="w-px h-6 bg-white/20 mx-2" />
            <button 
              className="p-2 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </motion.div>

        {/* Main Canvas */}
        <div 
          className="relative w-full h-full flex items-center justify-center p-4 md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Previous Button */}
          <NavigationButton 
            direction="left" 
            onClick={() => paginate(-1)} 
            visible={showControls}
          />

          {/* Image Container */}
          <div className="relative w-full h-[70vh] md:h-full md:max-h-[85vh] flex items-center justify-center">
             <AnimatePresence initial={false} custom={direction} mode='popLayout'>
              <motion.div
                key={page}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 }
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e: any, { offset, velocity }: PanInfo) => {
                  const swipe = swipePower(offset.x, velocity.x);

                  if (swipe < -swipeConfidenceThreshold) {
                    paginate(1);
                  } else if (swipe > swipeConfidenceThreshold) {
                    paginate(-1);
                  }
                }}
                className={`absolute w-full h-full flex items-center justify-center ${isZoomed ? 'cursor-zoom-out' : 'cursor-grab active:cursor-grabbing'}`}
                onClick={() => setIsZoomed(!isZoomed)}
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-0">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
                
                {/* Use img tag for base64/data URLs, Next.js Image for others */}
                {currentImage && currentImage.startsWith('data:') ? (
                  <img
                    src={currentImage}
                    alt={`Gallery image ${imageIndex + 1}`}
                    className={`w-full h-full object-contain transition-all duration-500 ease-out z-10 ${isZoomed ? 'scale-150' : 'scale-100'}`}
                    onLoad={() => setIsLoading(false)}
                    draggable={false}
                  />
                ) : (
                  <Image
                    src={getSafeImageUrl(currentImage)}
                    alt={`Gallery image ${imageIndex + 1}`}
                    fill
                    className={`object-contain transition-all duration-500 ease-out z-10 ${isZoomed ? 'scale-150' : 'scale-100'}`}
                    onLoad={() => setIsLoading(false)}
                    sizes="100vw"
                    priority
                    draggable={false}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next Button */}
          <NavigationButton 
            direction="right" 
            onClick={() => paginate(1)} 
            visible={showControls}
          />
        </div>

        {/* Bottom Thumbnails */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: showControls ? 0 : 100, opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-0 left-0 right-0 z-20 p-4 md:pb-6 bg-gradient-to-t from-black/90 to-transparent flex justify-center"
        >
          <div className="flex gap-2.5 overflow-x-auto max-w-full pb-2 px-4 scrollbar-hide snap-x">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setPage([idx, idx > imageIndex ? 1 : -1]);
                }}
                className={`relative w-12 h-12 md:w-16 md:h-16 flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 snap-center
                  ${idx === imageIndex 
                    ? 'ring-2 ring-white scale-110 opacity-100 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                    : 'opacity-40 hover:opacity-80 hover:scale-105'
                  }`}
              >
                {/* Use img for base64, Image for others */}
                {img && img.startsWith('data:') ? (
                  <img 
                    src={img} 
                    alt={`Thumbnail ${idx}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image 
                    src={getSafeImageUrl(img)} 
                    alt={`Thumbnail ${idx}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )}
              </button>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </AnimatePresence>
  );
}

const ControlButton = ({ onClick, icon, label }: { onClick: (e: any) => void, icon: React.ReactNode, label?: string }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/5 transition-all active:scale-95 group relative cursor-pointer"
    title={label}
  >
    {icon}
  </button>
);

const NavigationButton = ({ direction, onClick, visible }: { direction: 'left' | 'right', onClick: () => void, visible: boolean }) => (
  <motion.button
    initial={false}
    animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : direction === 'left' ? -20 : 20 }}
    className={`absolute ${direction === 'left' ? 'left-4' : 'right-4'} z-20 p-3 md:p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-all hover:scale-110 active:scale-95 hidden md:flex cursor-pointer`}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
  >
    {direction === 'left' ? <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" /> : <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />}
  </motion.button>
);
