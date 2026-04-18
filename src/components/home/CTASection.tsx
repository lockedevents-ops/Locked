"use client";

import Link from "next/link";
import { useAuth } from '@/contexts/AuthContext';

export function CTASection() {
  const { user, roles } = useAuth();
  const isOrganizer = roles?.includes('organizer');
  
  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{
        backgroundImage: "url('/hero_backgrounds/hero-bg-12.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        color: "white",
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-primary/80 z-0" />

      {/* Background decoration elements */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute left-0 bottom-0 w-96 h-96 bg-white/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-8">
          {/* For Event Attendees */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold mb-4">Find Your Next Event</h3>
            <p className="text-white/80 mb-6">
              Discover amazing events happening in Ghana. From music festivals to tech conferences, 
              find experiences that match your interests.
            </p>
            <Link 
              href="/pages/discover" 
              className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg hover:bg-white/90 transition-colors shadow-lg transform transition-transform duration-200 hover:-translate-y-1"
            >
              Browse Events
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Voting Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold mb-4">Vote on Events</h3>
            <p className="text-white/80 mb-6">
              Have a say in which events get featured on our platform. Vote on events you'd like to see 
              and help shape the future of Ghana's event scene.
            </p>
            <Link 
              href="/pages/discover?hasVoting=true" 
              className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg hover:bg-white/90 transition-colors shadow-lg transform transition-transform duration-200 hover:-translate-y-1"
            >
              Start Voting
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Rewards Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-2xl font-bold mb-4">Earn Rewards</h3>
            <p className="text-white/80 mb-6">
              Earn KEYS by engaging with events and the community. Redeem your KEYS for exclusive 
              rewards, discounts, and special experiences.
            </p>
            <Link 
              href="/pages/rewards" 
              className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg hover:bg-white/90 transition-colors shadow-lg transform transition-transform duration-200 hover:-translate-y-1"
            >
              View Rewards
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Dynamic Fourth Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            {!user ? (
              // Unauthenticated - Show organizer signup
              <>
                <h3 className="text-2xl font-bold mb-4">Start Hosting Events</h3>
                <p className="text-white/80 mb-6">
                  Ready to create unforgettable experiences? Join our platform to reach thousands 
                  of potential attendees and manage your events efficiently.
                </p>
                <Link 
                  href="/auth/signup" 
                  className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg hover:bg-white/90 transition-colors shadow-lg transform transition-transform duration-200 hover:-translate-y-1"
                >
                  Become an Organizer
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            ) : isOrganizer ? (
              // Authenticated Organizer - Show community features
              <>
                <h3 className="text-2xl font-bold mb-4">Engage with Your Community</h3>
                <p className="text-white/80 mb-6">
                  Connect with other organizers, discover trending events, and stay updated with 
                  platform insights to grow your audience.
                </p>
                <Link 
                  href="/pages/organizers" 
                  className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg hover:bg-white/90 transition-colors shadow-lg transform transition-transform duration-200 hover:-translate-y-1"
                >
                  Explore Community
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            ) : (
              // Authenticated Non-Organizer - Show locked events
              <>
                <h3 className="text-2xl font-bold mb-4">Your Locked Events</h3>
                <p className="text-white/80 mb-6">
                  Keep track of events you're interested in. Lock events to save them and get 
                  notified when tickets go on sale or updates are available.
                </p>
                <Link 
                  href="/dashboards/user/locked" 
                  className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg hover:bg-white/90 transition-colors shadow-lg transform transition-transform duration-200 hover:-translate-y-1"
                >
                  View Locked Events
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
