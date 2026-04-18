"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { TrustedValueProps } from "@/components/home/TrustedValueProps";

// Array of background images to cycle through
const backgroundImages = [
  "/hero_backgrounds/hero-4.webp",
];

export function HeroSection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [useVideo, setUseVideo] = useState(true); // Default to video
  
  // ✅ PHASE 1 OPTIMIZATION: Detect slow connection and use image instead of video
  useEffect(() => {
    // Check if Network Information API is available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      // Use image if connection is slow (2g, slow-2g) or save-data is enabled
      const effectiveType = connection.effectiveType;
      const saveData = connection.saveData;
      
      if (effectiveType === '2g' || effectiveType === 'slow-2g' || saveData) {
        setUseVideo(false);
      }
    }
  }, []);
  
  // Image carousel effect
  useEffect(() => {
    // Preload all images
    backgroundImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
    
    const interval = setInterval(() => {
      setCurrentImageIndex(prevIndex => (prevIndex + 1) % backgroundImages.length);
    }, 6000); // Change image every 6 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleExploreClick = () => {
    document.getElementById('upcoming-events')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get authentication state from useAuth hook (more reliable than store)
  const { user, roles } = useAuth();
  const isAuthenticated = !!user;
  const isOrganizer = roles?.includes('organizer');

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[400px] md:h-screen flex items-center md:items-center overflow-hidden rounded-b-[2rem] md:rounded-b-none">
        {/* Video Background - Desktop Only (if good connection) */}
        {/* ✅ PHASE 1 OPTIMIZATION: Show image on slow connections instead of video */}
        {useVideo ? (
          <video 
            className="hidden md:block absolute inset-0 w-full h-full object-cover z-0"
            autoPlay 
            muted 
            loop 
            playsInline
            preload="metadata"
            poster="/hero_backgrounds/hero-poster-desktop.jpg"
          >
            <source src="/hero_backgrounds/hero-desktop.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="hidden md:block absolute inset-0 w-full h-full pointer-events-none select-none">
            {backgroundImages.map((src, idx) => (
              <div
                key={src}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ease-in-out will-change-opacity ${idx === currentImageIndex ? 'opacity-90' : 'opacity-0'}`}
                style={{ backgroundImage: `url(${src})`, transform: 'scale(1.02)' }}
                aria-hidden={idx === currentImageIndex ? 'false' : 'true'}
              />
            ))}
          </div>
        )}

        {/* Fallback: Cross-fade Background Images - Desktop (commented out, uncomment if video isn't optimized) */}
        {/* <div className="hidden md:block absolute inset-0 w-full h-full pointer-events-none select-none">
          {backgroundImages.map((src, idx) => (
            <div
              key={src}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ease-in-out will-change-opacity ${idx === currentImageIndex ? 'opacity-90' : 'opacity-0'}`}
              style={{ backgroundImage: `url(${src})`, transform: 'scale(1.02)' }}
              aria-hidden={idx === currentImageIndex ? 'false' : 'true'}
            />
          ))}
        </div> */}

        {/* Cross-fade Background Images - Mobile Only */}
        {/* Mobile Background - Video or Image Slideshow */}
        {useVideo ? (
          <video
            className="md:hidden absolute inset-0 w-full h-full object-cover z-0"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/hero_backgrounds/hero-poster-mobile.jpg"
          >
            <source src="/hero_backgrounds/hero-mobile.mp4" type="video/mp4" />
          </video>
        ) : (
          <div className="md:hidden absolute inset-0 w-full h-full pointer-events-none select-none">
            {backgroundImages.map((src, idx) => (
              <div
                key={src}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ease-in-out will-change-opacity ${idx === currentImageIndex ? 'opacity-90' : 'opacity-0'}`}
                style={{ backgroundImage: `url(${src})`, transform: 'scale(1.02)' }}
                aria-hidden={idx === currentImageIndex ? 'false' : 'true'}
              />
            ))}
          </div>
        )}

        {/* Darker Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/100 to-primary-dark/90 z-10" />

        {/* Foreground Content - Centered on mobile and desktop */}
        <div className="container mx-auto px-4 relative z-20 flex items-center md:items-center h-full">
          <div className="max-w-3xl text-center md:text-left w-full">
            {/* Eyebrow text */}
            <div className="inline-flex items-center gap-2 bg-accent/10 backdrop-blur-sm border border-accent/20 rounded-full px-4 py-2 mb-6">
              <span className="text-accent text-xs md:text-sm font-medium tracking-wide uppercase">
                Ghana's Premier Event Platform
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Discover, Vote & Experience
              <br />
              <span className="text-accent">Amazing Events</span>
            </h1>

            {/* Description - Better version */}
            <p className="text-lg md:text-xl text-white mb-8 leading-relaxed">
              Discover and book the best events and venues around the world. Enjoy seamless ticketing and interactive voting — all in one platform.
            </p>

            {/* CTA Buttons - Visual Hierarchy: Primary (solid) > Secondary (outline) > Tertiary (subtle outline) */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4 mb-0 md:mb-12 justify-center md:justify-start">
              {/* Primary CTA - Solid background for maximum emphasis */}
              <Link 
                href="/pages/discover" 
                className="bg-white hover:bg-accent text-primary hover:text-black px-8 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 block text-center"
              >
                Explore Events
              </Link>
              
              {/* Secondary CTA - Host Event (adapts to user state) */}
              {isAuthenticated && isOrganizer ? (
                <Link 
                  href="/dashboards/organizer"
                  className="border-2 border-accent bg-accent/10 backdrop-blur-sm hover:bg-accent text-accent hover:text-black px-6 py-3 rounded-full font-medium transition-all duration-300 block text-center"
                >
                  Host Event
                </Link>
              ) : isAuthenticated ? (
                <Link 
                  href="/dashboards/organizer"
                  className="border-2 border-accent bg-accent/10 backdrop-blur-sm hover:bg-accent text-accent hover:text-black px-6 py-3 rounded-full font-medium transition-all duration-300 block text-center"
                >
                  Become a Host
                </Link>
              ) : (
                <Link 
                  href="/auth/signin" 
                  className="border-2 border-accent bg-accent/10 backdrop-blur-sm hover:bg-accent text-accent hover:text-black px-6 py-3 rounded-full font-medium transition-all duration-300 block text-center"
                >
                  Host Event
                </Link>
              )}
              
              {/* Tertiary CTA - Vote Now */}
              <Link 
                href="/pages/discover?hasVoting=true" 
                className="border-2 border-white/60 hover:border-white bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 block text-center"
              >
                Vote Now
              </Link>
              
              {/* Tertiary CTA - Rewards */}
              <Link 
                href="/pages/rewards"
                className="border-2 border-white/40 hover:border-white bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 block text-center"
              >
                Rewards
              </Link>
            </div>

            {/* Trusted Platform Section - Desktop Only (Inside Hero) */}
            <div className="hidden md:block mt-12 pt-8 border-t border-white/20">
              <TrustedValueProps />
            </div>
          </div>

        </div>
      </section>

      {/* Trusted Platform Section - now reused from TrustedValueProps */}
    </>
  );
}
