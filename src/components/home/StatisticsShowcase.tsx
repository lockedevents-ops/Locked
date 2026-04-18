"use client";

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useInView } from 'react-intersection-observer';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { platformStatsService, PlatformStats } from '@/services/platformStatsService';
import { useAuth } from '@/contexts/AuthContext';

interface Statistic {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

export function StatisticsShowcase() {
  // Add state for dynamic events
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add state for real-time statistics
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Get user authentication and role info
  const { user, roles } = useAuth();
  const isOrganizer = roles?.includes('organizer');
  
  // Load real-time statistics from database
  useEffect(() => {
    const loadStats = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      setStatsLoading(true);
      try {
        const stats = await platformStatsService.getPlatformStats();
        setPlatformStats(stats);
      } catch (error) {
        console.error('Error loading platform stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();

    // Refresh less aggressively to reduce repeated load on homepage traffic.
    const statsInterval = setInterval(loadStats, 120000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(statsInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Load dynamic CTA card based on user role
  useEffect(() => {
    // Determine card content based on user authentication and role
    let cardContent;
    
    if (!user) {
      // Not authenticated - encourage sign up to become organizer
      cardContent = {
        id: "create-event-cta",
        title: "Create Your First Event",
        description: "Start organizing amazing events on our platform today",
        imageUrl: "/images/party-girls.jpg",
        ctaText: "Get Started",
        ctaLink: "/pages/guides/hosting",
        isCtaCard: true
      };
    } else if (isOrganizer) {
      // User is already an organizer - direct to dashboard
      cardContent = {
        id: "organizer-dashboard-cta",
        title: "Manage Your Events",
        description: "Access your organizer dashboard to create and manage events",
        imageUrl: "/images/admin.webp",
        ctaText: "Go to Dashboard",
        ctaLink: "/dashboards/organizer",
        isCtaCard: true
      };
    } else {
      // User is authenticated but not an organizer - show role request
      cardContent = {
        id: "become-organizer-cta",
        title: "Become an Organizer",
        description: "Request organizer access to start creating amazing events",
        imageUrl: "/images/party-girls.jpg",
        ctaText: "Request Access",
        ctaLink: "/dashboards/organizer", // Will show role request page
        isCtaCard: true
      };
    }
    
    setFeaturedEvents([cardContent]);
    setIsLoading(false);
  }, [user, isOrganizer]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
    setAutoplay(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length);
    setAutoplay(false);
  };
  // Pause autoplay on hover
  const handleMouseEnter = () => setAutoplay(false);
  const handleMouseLeave = () => setAutoplay(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate dynamic stats based on real database data
  const stats: Statistic[] = platformStats ? [
    { 
      value: platformStatsService.formatNumber(platformStats.eventsHosted), 
      label: "Events Hosted", 
      suffix: "+" 
    },
    { 
      value: platformStatsService.formatNumber(platformStats.totalAttendees), 
      label: "Attendees", 
      suffix: "+" 
    },
    { 
      value: platformStatsService.formatNumber(platformStats.votesCast), 
      label: "Votes Cast", 
      suffix: "+" 
    },
    { 
      value: platformStats.satisfactionRate.toString(), 
      label: "Satisfaction Rate", 
      suffix: "%" 
    },
    { 
      value: platformStatsService.formatNumber(platformStats.venuesWorldwide), 
      label: "Venues Worldwide", 
      suffix: "+" 
    },
    { 
      value: platformStatsService.formatNumber(platformStats.organizers), 
      label: "Organizers", 
      suffix: "+" 
    }
  ] : [
    // Fallback/loading values
    { value: "...", label: "Events Hosted", suffix: "" },
    { value: "...", label: "Attendees", suffix: "" },
    { value: "...", label: "Votes Cast", suffix: "" },
    { value: "98", label: "Satisfaction Rate", suffix: "%" },
    { value: "...", label: "Venues Worldwide", suffix: "" },
    { value: "...", label: "Organizers", suffix: "" }
  ];

  const { ref: sectionRef, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Handle automatic slideshow
  useEffect(() => {
    if (!autoplay || featuredEvents.length <= 1) return;
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Set new interval
    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % featuredEvents.length);
    }, 5000); 
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoplay, currentSlide, featuredEvents.length]);

  // Don't show carousel controls if only 1 event
  const showControls = featuredEvents.length > 1;

  return (
    <section ref={sectionRef} className="relative py-16 md:py-20 overflow-hidden bg-white text-neutral-900">
      {/* Simplified background pattern for better mobile appearance */}
      <div className="absolute inset-0 z-0 opacity-10 hidden md:block">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute left-0 bottom-0 w-96 h-96 bg-white/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

  {/* Mobile-friendly subtle background (light) */}
  <div className="absolute inset-0 bg-white md:hidden"></div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Two column layout with better mobile stacking */}
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          {/* Left column - Carousel */}
          <div 
            className="flex-1 rounded-xl overflow-hidden shadow-lg mb-8 md:mb-0 w-full max-w-md mx-auto md:max-w-none order-2 md:order-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="relative aspect-[4/3] bg-gradient-to-br from-black/40 to-black/20">
              {/* Loading state */}
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>
                </div>
              ) : (
                /* Image carousel */
                <div className="relative w-full h-full">
                  {featuredEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                        currentSlide === index ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                    >
                      <Image 
                        src={event.imageUrl} 
                        alt={event.title}
                        fill
                        className={`object-cover ${event.imageUrl === '/images/admin.webp' ? 'scale-x-[-1]' : ''}`}
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-6">
                        <h3 className="text-white text-xl font-bold">{event.title}</h3>
                        <p className="text-white/80">{event.description}</p>
                        <Link 
                          href={event.ctaLink || "/pages/guides/hosting"}
                          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white hover:underline"
                        >
                          {event.ctaText || "View Details"}
                        </Link>
                      </div>
                    </div>
                  ))}
                  
                  {/* Only show controls if multiple events */}
                  {showControls && (
                    <>
                      {/* Carousel navigation buttons */}
                      <button 
                        onClick={prevSlide}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                        aria-label="Previous slide"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={nextSlide}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors"
                        aria-label="Next slide"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      
                      {/* Carousel indicators */}
                      <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
                        {featuredEvents.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setCurrentSlide(index);
                              setAutoplay(false);
                            }}
                            className={`w-2 h-2 rounded-full transition-all ${
                              currentSlide === index 
                                ? 'bg-white w-4' 
                                : 'bg-white/50 hover:bg-white/80'
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column - Content */}
          <div className="flex-1 text-neutral-900 order-1 md:order-2">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 md:mb-6 text-center md:text-left tracking-tight leading-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              DISCOVER. CONNECT. EXPERIENCE.
            </h2>
            <p className="text-sm md:text-base text-neutral-700 font-normal mb-4 md:mb-6 max-w-lg text-center md:text-left leading-relaxed">
              Unlock unforgettable moments at events that bring people together. From local gatherings to global festivals, Locked is your gateway to connection and celebration.
            </p>
            {/* Statistics grid - Enhanced with better cards and hover effects */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`transform ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} 
                    bg-neutral-50 rounded-xl p-5 border border-gray-100
                    transition-all duration-300 text-center flex flex-col items-center justify-center min-h-[120px] h-full`}
                  style={{
                    transitionProperty: 'opacity, transform',
                    transitionDuration: '0.5s',
                    transitionDelay: `${index * 0.1 + 0.2}s`,
                    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <div className="relative z-10 w-full flex flex-col items-center justify-center">
                    <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 text-neutral-900">
                      {stat.suffix ? <>{stat.value}{stat.suffix}</> : stat.value}
                    </div>
                    <div className="text-neutral-600 text-sm md:text-base">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}