"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from '@/components/ui/AppImage';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryModal } from './GalleryModal';

interface GalleryCarouselProps {
  images: string[];
  onImageClick?: (index: number) => void;
}

export function GalleryCarousel({ images, onImageClick }: GalleryCarouselProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showPrevButton, setShowPrevButton] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check scroll buttons visibility
  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowPrevButton(scrollLeft > 10); // slightly more forgiveness
      setShowNextButton(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const handleResize = () => checkScrollButtons();
    
    // Initial check
    checkScrollButtons();
    
    // Safety check after images might have loaded
    const timeout = setTimeout(checkScrollButtons, 500);

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [images]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollLeft);
      checkScrollButtons();
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.75; // Scroll 75% of view width
      const targetScroll = direction === 'left' 
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  const handleImageClick = (index: number) => {
    if (onImageClick) {
      // If external handler is provided, use it instead of opening internal modal
      onImageClick(index);
    } else {
      // Otherwise open internal modal for standalone carousel usage
      setSelectedImageIndex(index);
      setGalleryModalOpen(true);
    }
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set(prev).add(index));
  };

  if (!images || images.length === 0) {
    return null;
  }

  const getSafeImageUrl = (image: string) => {
    if (!image) return '/events/default-image.jpg';
    return typeof image === 'string' ?
      (image.startsWith('http') || image.startsWith('/') ? image : `/events/${image}`) 
      : '/events/default-image.jpg';
  };

  return (
    <>
      <div className="relative w-full group/carousel">
        {/* Left Scroll Button - Glassmorphic */}
        {showPrevButton && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/20 text-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all md:-ml-4 opacity-0 group-hover/carousel:opacity-100"
            title="Prev"
          >
            <ChevronLeft className="w-5 h-5 drop-shadow-sm" />
          </button>
        )}

        {/* Right Scroll Button - Glassmorphic */}
        {showNextButton && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/20 text-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all md:-mr-4 opacity-0 group-hover/carousel:opacity-100"
            title="Next"
          >
            <ChevronRight className="w-5 h-5 drop-shadow-sm" />
          </button>
        )}

        {/* Gradient Masks for edges */}
        <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-300 ${showPrevButton ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-300 ${showNextButton ? 'opacity-100' : 'opacity-0'}`} />

        {/* Gallery Scroll Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-2 px-1 scrollbar-hide snap-x"
          style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              className="relative h-20 min-w-[100px] md:h-24 md:min-w-[130px] lg:h-28 lg:min-w-[150px] rounded-lg overflow-hidden cursor-pointer group flex-shrink-0 snap-start shadow-md hover:shadow-xl transition-all duration-300 border border-white/5"
              onClick={() => handleImageClick(index)}
            >
              {/* Skeleton / Loading State */}
              {!loadedImages.has(index) && (
                <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              )}

              <Image
                src={getSafeImageUrl(image)}
                alt={`Gallery image ${index + 1}`}
                fill
                className={`object-cover transition-transform duration-500 ${!loadedImages.has(index) ? 'opacity-0' : 'opacity-100'}`}
                sizes="(max-width: 768px) 120px, (max-width: 1024px) 160px, 190px"
                onLoad={() => handleImageLoad(index)}
              />
              
              {/* Premium Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2 text-white text-xs font-medium bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                  <span>View</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <GalleryModal 
        isOpen={galleryModalOpen} 
        onClose={() => setGalleryModalOpen(false)}
        images={images}
        selectedIndex={selectedImageIndex}
      />
    </>
  );
}

