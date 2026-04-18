"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { SectionHeading } from '@/components/ui/SectionHeading';
import { TrustedValueProps } from '@/components/home/TrustedValueProps';

export function TrustedByCarousel() {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // ✅ PHASE 1: Track loading state
  
  // ✅ PHASE 1: Set loaded after component mounts to prevent glitch
  useEffect(() => {
    setIsLoaded(true);
  }, []);
  
  // Trusted partners with logos and website URLs (to be added later)
  const partners = [
    { name: "Afrochella", logo: "/partners/afrochella.png", url: "" },
    { name: "Ghana Tourism Authority", logo: "/partners/gta.png", url: "" },
    { name: "Movenpick Ambassador Hotel", logo: "/partners/movenpick.png", url: "" },
    { name: "Silverbird Cinemas", logo: "/partners/silverbird-cinemas.png", url: "" },
    { name: "West Hills Mall", logo: "/partners/west-hill-mall.png", url: "" }
  ];

  // Duplicate partners array for seamless infinite scroll
  const duplicatedPartners = [...partners, ...partners];

  // Handle partner click - will open partner website when URLs are added
  const handlePartnerClick = (partner: typeof partners[0]) => {
    // TODO: Open partner website when URLs are provided
    // if (partner.url) {
    //   window.open(partner.url, '_blank', 'noopener,noreferrer');
    // }
  };

  return (
    <section className="py-6 md:py-8 bg-gradient-to-b from-white to-neutral-50 overflow-hidden border-t border-neutral-100">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <SectionHeading
          eyebrow="Trusted Partners"
          title="Powering Ghana's Top Brands & Creators"
          description="The companies and venues that trust Locked to power their experiences."
        />

        {/* ✅ PHASE 1: Show skeleton while loading to prevent glitch */}
        {!isLoaded ? (
          <div className="relative">
            <div className="flex gap-3 md:gap-4 justify-center overflow-hidden py-2">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className="w-28 md:w-36 h-12 md:h-14 bg-neutral-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Infinite Scroll Container */}
            <div className="relative">
          {/* Fade overlay on left */}
          <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-white via-white/90 to-transparent z-10 pointer-events-none" />
          
          {/* Fade overlay on right */}
          <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-neutral-50 via-neutral-50/90 to-transparent z-10 pointer-events-none" />
          
          {/* Scrolling logos wrapper */}
          <div 
            className="carousel-wrapper"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className={`carousel-track ${isHovered ? 'paused' : ''}`}>
              {duplicatedPartners.map((partner, index) => (
                <div
                  key={`partner-${index}`}
                  className="carousel-item"
                >
                  <div 
                    className="partner-card group"
                    onClick={() => handlePartnerClick(partner)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePartnerClick(partner);
                      }
                    }}
                  >
                    <Image 
                      src={partner.logo} 
                      alt={partner.name}
                      width={120}
                      height={120}
                      className="partner-logo"
                      sizes="(max-width: 768px) 160px, 192px"
                      priority={index < 2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats text */}
        <div className="text-center mt-4">
          <p className="text-xs text-neutral-500">
            Join <span className="font-semibold text-neutral-900">500+</span> trusted organizers and venues
          </p>
        </div>
        </>
        )}
      </div>



      {/* Optimized CSS for smooth infinite scroll */}
      <style jsx>{`
        .carousel-wrapper {
          overflow: hidden;
          position: relative;
          width: 100%;
          padding: 0.5rem 0;
        }

        .carousel-track {
          display: flex;
          gap: 1rem;
          animation: scroll 30s linear infinite;
          will-change: transform;
        }

        .carousel-track.paused {
          animation-play-state: paused;
        }

        .carousel-item {
          flex-shrink: 0;
          width: 112px;
          height: 56px;
        }

        @media (min-width: 768px) {
          .carousel-item {
            width: 144px;
            height: 72px;
          }
          
          .carousel-track {
            gap: 1.25rem;
          }
        }

        .partner-card {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          outline: none;
          overflow: hidden;
        }

        .partner-card:hover {
          border-color: rgba(0, 0, 0, 0.3);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transform: translateY(-2px);
        }

        .partner-card:focus-visible {
          outline: 2px solid #000;
          outline-offset: 2px;
        }

        .partner-logo {
          max-width: 85%;
          max-height: 85%;
          width: auto;
          height: auto;
          object-fit: contain;
          filter: grayscale(100%);
          opacity: 0.7;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: block;
        }

        .partner-card:hover .partner-logo {
          filter: grayscale(0%);
          opacity: 1;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-112px * 5 - 1rem * 5));
          }
        }

        @media (min-width: 768px) {
          @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(calc(-144px * 5 - 1.25rem * 5));
            }
          }
        }

        /* Smooth performance optimizations */
        .carousel-track {
          backface-visibility: hidden;
          perspective: 1000px;
        }
      `}</style>
    </section>
  );
}
