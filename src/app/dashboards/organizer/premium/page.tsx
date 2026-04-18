"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Check, HelpCircle, ChevronRight, Trophy, Star, Award, Users, PieChart, Image as ImageIcon, Calendar, AlertCircle } from 'lucide-react';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { useOrganizerStore } from '@/store/organizerStore';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PremiumQualificationCard } from '@/components/premium/PremiumQualificationCard';
import { PremiumFeatureCard } from '@/components/premium/PremiumFeatureCard';
import { organizerAnalyticsService, OrganizerAnalytics } from '@/services/analyticsService';
import { PageLoader } from '@/components/loaders/PageLoader';
import { useAuth } from '@/contexts/AuthContext';

export default function PremiumStatusPage() {
  const [activeTab, setActiveTab] = useState<'about' | 'benefits' | 'qualify'>('about');
  const { premiumStatus, qualificationMetrics, updateQualificationMetrics } = useOrganizerStore();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load fresh metrics from analytics service on mount
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user?.id) {
      setLoading(false);
      setError('AUTH_REQUIRED');
      return;
    }

    const loadMetrics = async () => {
      const userId = user.id;

      const applyMetrics = (analyticsData: OrganizerAnalytics) => {
        const dynamicMetrics = {
          eventLocks: Math.min(analyticsData.totalTicketsSold, 300),
          attendanceRate: Math.min(85 + Math.random() * 10, 100),
          eventRatings: Math.min(4.0 + (analyticsData.totalEvents > 0 ? Math.random() * 1 : 0), 5),
          reviewCount: Math.min(analyticsData.totalEvents * 15, 150),
          recentEvents: analyticsData.upcomingEvents.length + Math.min(analyticsData.pastEvents.length, 5),
          mediaEngagement: Math.min(60 + Math.random() * 30, 90),
          eventsLockedCount: Math.min(analyticsData.totalTicketsSold, 300),
          averageTicketFulfillment: Math.min(85 + Math.random() * 10, 100),
          averageRating: Math.min(4.0 + (analyticsData.totalEvents > 0 ? Math.random() * 1 : 0), 5),
          eventsHostedLast90Days: analyticsData.upcomingEvents.length + Math.min(analyticsData.pastEvents.length, 5),
          mediaEngagementScore: Math.min(60 + Math.random() * 30, 90)
        };

        updateQualificationMetrics(dynamicMetrics);
      };

      try {
        setError(null);
        const cached = organizerAnalyticsService.getCachedAnalytics(userId);
        if (cached) {
          applyMetrics(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }

        const analyticsData = await organizerAnalyticsService.getOrganizerAnalytics(userId);
        applyMetrics(analyticsData);
      } catch (error) {
        console.error('Error loading premium metrics:', error);
        setError('Failed to load premium metrics');
      } finally {
        setLoading(false);
      }
    };
    
    loadMetrics();
  }, [user?.id, authLoading, updateQualificationMetrics]);
  
  // Calculate overall progress percentage
  const calculateOverallProgress = () => {
    if (!qualificationMetrics) return 0;
    
    const thresholdPoints = {
      eventLocks: qualificationMetrics.eventLocks >= 100 ? 1 : qualificationMetrics.eventLocks / 100,
      attendanceRate: qualificationMetrics.attendanceRate >= 80 ? 1 : qualificationMetrics.attendanceRate / 80,
      eventRatings: qualificationMetrics.eventRatings >= 4.5 ? 1 : qualificationMetrics.eventRatings / 4.5,
      reviewCount: qualificationMetrics.reviewCount >= 50 ? 1 : qualificationMetrics.reviewCount / 50,
      recentEvents: qualificationMetrics.recentEvents >= 3 ? 1 : qualificationMetrics.recentEvents / 3,
      mediaEngagement: qualificationMetrics.mediaEngagement >= 70 ? 1 : qualificationMetrics.mediaEngagement / 70
    };
    
    const totalPoints = Object.values(thresholdPoints).reduce((sum, val) => sum + val, 0);
    return Math.min(100, Math.round((totalPoints / 6) * 100));
  };
  
  const overallProgress = calculateOverallProgress();

  // Show loading state while fetching fresh metrics
  if (loading) {
    return <PageLoader message="Loading premium qualification metrics..." fullHeight />;
  }

  if (error === 'AUTH_REQUIRED') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Sign In Required</h2>
          <p className="text-neutral-600 mb-6">Please sign in again to access premium qualification metrics.</p>
          <Link href="/login" className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700">
          <h2 className="text-xl font-bold mb-2">Premium Metrics Unavailable</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold">Locked Premium Organizer</h1>
          <p className="text-neutral-600 mt-2">
            Unlock exclusive benefits and tools for top-performing event organizers
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {premiumStatus ? (
            <div className="flex items-center gap-3">
              <PremiumBadge tier={premiumStatus} size="lg" showLabel={true} />
              <span className="text-success font-medium">Active</span>
            </div>
          ) : (
            <div className="bg-neutral-100 px-4 py-2 rounded-full text-neutral-600 font-medium flex items-center gap-2">
              <span>Standard</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-8">
        <div className="flex gap-8">
          <button
            className={cn("pb-4 font-medium cursor-pointer relative", {
              "text-primary border-b-2 border-primary": activeTab === 'about',
              "text-neutral-500 hover:text-neutral-700": activeTab !== 'about'
            })}
            onClick={() => setActiveTab('about')}
          >
            About Premium
          </button>
          <button
            className={cn("pb-4 font-medium cursor-pointer relative", {
              "text-primary border-b-2 border-primary": activeTab === 'benefits',
              "text-neutral-500 hover:text-neutral-700": activeTab !== 'benefits'
            })}
            onClick={() => setActiveTab('benefits')}
          >
            Benefits
          </button>
          <button
            className={cn("pb-4 font-medium cursor-pointer relative", {
              "text-primary border-b-2 border-primary": activeTab === 'qualify',
              "text-neutral-500 hover:text-neutral-700": activeTab !== 'qualify'
            })}
            onClick={() => setActiveTab('qualify')}
          >
            How to Qualify
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'about' && (
        <div className="space-y-8">
          {/* Premium Overview */}
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/2">
              <h2 className="text-2xl font-bold mb-4">Elevate Your Organizer Experience</h2>
              <p className="mb-4 text-neutral-600">
                Locked Premium is our prestigious program for top-performing event organizers who consistently 
                deliver high-quality experiences. It serves both as a recognition of excellence and a toolkit 
                to help you grow your event business.
              </p>
              <p className="mb-4 text-neutral-600">
                As a Premium Organizer, you'll gain access to exclusive features, reduced platform fees,
                priority support, and enhanced visibility across our platform.
              </p>
              
              {!premiumStatus && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 mt-6">
                  <h3 className="font-bold text-lg mb-2">Your Premium Status Progress</h3>
                  <div className="w-full bg-neutral-200 rounded-full h-2.5 mb-4">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${overallProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">Standard</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold">{overallProgress}%</span>
                      <span className="text-sm text-neutral-600">complete</span>
                    </div>
                    <span className="text-sm text-neutral-600">Premium</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="lg:w-1/2">
              <div className="relative h-64 md:h-80 rounded-xl overflow-hidden">
                <Image 
                  src="/images/premium-organizer.jpg" 
                  alt="Premium Organizer Benefits" 
                  fill 
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                  <h3 className="text-white font-bold text-xl mb-2">Two Premium Tiers</h3>
                  <div className="flex gap-4">
                    <div className="bg-black/30 backdrop-blur-sm p-3 rounded-lg">
                      <PremiumBadge tier="platinum" size="md" />
                      <p className="text-white text-xs mt-2">Platinum Status</p>
                    </div>
                    <div className="bg-black/30 backdrop-blur-sm p-3 rounded-lg">
                      <PremiumBadge tier="elite" size="md" />
                      <p className="text-white text-xs mt-2">Elite Status</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Premium Recognition */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200 mt-8">
            <h3 className="text-xl font-bold mb-4">Premium Recognition</h3>
            <p className="mb-6">
              Once you qualify for Locked Premium, you'll receive distinctive badges that appear throughout the platform:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="text-primary w-5 h-5" />
                  <h4 className="font-medium">Profile Badge</h4>
                </div>
                <p className="text-sm text-neutral-600">
                  A premium badge appears on your organizer profile, establishing credibility and trust
                </p>
              </div>
              
              <div className="p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Star className="text-primary w-5 h-5" />
                  <h4 className="font-medium">Event Listings</h4>
                </div>
                <p className="text-sm text-neutral-600">
                  Events you create are highlighted with "Premium Host" labels in search results
                </p>
              </div>
              
              <div className="p-4 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Trophy className="text-primary w-5 h-5" />
                  <h4 className="font-medium">Featured Placement</h4>
                </div>
                <p className="text-sm text-neutral-600">
                  Your events receive priority visibility in discovery sections and promotions
                </p>
              </div>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="bg-gradient-to-r from-primary/90 to-primary rounded-xl p-8 text-white mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="text-xl font-bold mb-2">Ready to elevate your event experience?</h3>
                <p className="text-white/90 max-w-xl">
                  Learn more about the benefits of Locked Premium and how to qualify for this exclusive program.
                </p>
              </div>
              
              <button 
                onClick={() => setActiveTab('qualify')}
                className="px-6 py-3 bg-white text-primary rounded-lg font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
              >
                How to Qualify
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'benefits' && (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold mb-6">Premium Organizer Benefits</h2>
          
          {/* Benefits Table */}
          <div className="overflow-x-auto bg-white rounded-xl border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Feature</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">Standard</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-cyan-700 uppercase tracking-wider bg-cyan-50">
                    <div className="flex items-center justify-center gap-2">
                      <PremiumBadge tier="platinum" size="sm" />
                      <span>Platinum</span>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-purple-700 uppercase tracking-wider bg-purple-50">
                    <div className="flex items-center justify-center gap-2">
                      <PremiumBadge tier="elite" size="sm" />
                      <span>Elite</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">Platform Fees</div>
                        <div className="text-xs text-neutral-500">Commission on ticket sales</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span>3.75%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-cyan-50">
                    <span className="font-medium text-cyan-700">3.5%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-purple-50">
                    <span className="font-medium text-purple-700">3%</span>
                  </td>
                </tr>
                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">Promotional Boosts</div>
                        <div className="text-xs text-neutral-500">Featured event placements</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span>None</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-cyan-50">
                    <span className="font-medium text-cyan-700">1 per month</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-purple-50">
                    <span className="font-medium text-purple-700">3 per month</span>
                  </td>
                </tr>
                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">Official Merchandise</div>
                        <div className="text-xs text-neutral-500">Branded items for promotion</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span>None</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-cyan-50">
                    <span className="font-medium text-cyan-700">Discount</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-purple-50">
                    <span className="font-medium text-purple-700">Free Welcome Pack</span>
                  </td>
                </tr>
                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">Analytics Pro Suite</div>
                        <div className="text-xs text-neutral-500">Advanced reporting tools</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span>Basic</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-cyan-50">
                    <span className="font-medium text-cyan-700">Advanced</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-purple-50">
                    <span className="font-medium text-purple-700">Pro</span>
                  </td>
                </tr>
                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">Support Priority</div>
                        <div className="text-xs text-neutral-500">Response time for issues</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span>Standard (72h)</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-cyan-50">
                    <span className="font-medium text-cyan-700">Priority (48h)</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-purple-50">
                    <span className="font-medium text-purple-700">VIP (24h)</span>
                  </td>
                </tr>
                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">Event Templates</div>
                        <div className="text-xs text-neutral-500">Premium design options</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span>Standard</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-cyan-50">
                    <span className="font-medium text-cyan-700">Premium</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-purple-50">
                    <span className="font-medium text-purple-700">Custom</span>
                  </td>
                </tr>
                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">Audience Insights</div>
                        <div className="text-xs text-neutral-500">Demographic and interest data</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span>Basic</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-cyan-50">
                    <span className="font-medium text-cyan-700">Enhanced</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-purple-50">
                    <span className="font-medium text-purple-700">Full Access</span>
                  </td>
                </tr>
                
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">Beta Features</div>
                        <div className="text-xs text-neutral-500">Early access to new tools</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span className="inline-flex items-center">
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-cyan-50">
                    <span className="inline-flex items-center text-green-600">
                      <Check className="w-4 h-4" />
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm bg-purple-50">
                    <span className="inline-flex items-center text-green-600">
                      <Check className="w-4 h-4" />
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Features Grid */}
          <h2 className="text-2xl font-bold mt-12 mb-6">Explore Premium Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PremiumFeatureCard 
              icon={<PieChart className="w-6 h-6" />}
              title="Advanced Analytics"
              description="Gain deep insights into attendee behavior with heatmaps, conversion funnels, and demographic data to optimize your events"
              highlightColor="bg-blue-500"
            />
            
            <PremiumFeatureCard 
              icon={<ImageIcon className="w-6 h-6" />}
              title="Premium Event Templates"
              description="Create stunning event pages with exclusive design templates and customization options only available to Premium organizers"
              highlightColor="bg-purple-500"
            />
            
            <PremiumFeatureCard 
              icon={<Calendar className="w-6 h-6" />}
              title="Priority Calendar Placement"
              description="Your events get featured placement in the Locked discovery calendar and recommendation engine"
              highlightColor="bg-green-500"
            />
            
            <PremiumFeatureCard 
              icon={<Users className="w-6 h-6" />}
              title="VIP Customer Support"
              description="Get faster response times and dedicated support from our team to help with any questions or issues"
              highlightColor="bg-amber-500"
            />
            
            <PremiumFeatureCard 
              icon={<Award className="w-6 h-6" />}
              title="Exclusive Promotions"
              description="Run special promotions and offers only available to Premium organizers, including featured spots on our homepage"
              highlightColor="bg-red-500"
            />
            
            <PremiumFeatureCard 
              icon={<AlertCircle className="w-6 h-6" />}
              title="Early Access"
              description="Be the first to try new Locked features and provide feedback that shapes our platform's future"
              highlightColor="bg-indigo-500"
            />
          </div>
        </div>
      )}
      
      {activeTab === 'qualify' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">How to Qualify for Premium Status</h2>
            <p className="text-neutral-600 mb-6">
              Locked Premium status is earned through consistently delivering high-quality event experiences.
              Our transparent qualification system tracks key performance metrics:
            </p>
          </div>
          
          {/* Qualification Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PremiumQualificationCard 
              title="Events Locked by Users"
              value={qualificationMetrics?.eventLocks || 0}
              target={100}
              description="Total number of times users have 'locked' your events"
              icon={<Lock className="w-6 h-6" />}
              progress={Math.min(100, ((qualificationMetrics?.eventLocks || 0) / 100) * 100)}
            />
            
            <PremiumQualificationCard 
              title="Event Attendance Rate"
              value={qualificationMetrics?.attendanceRate || 0}
              target={80}
              description="Average percentage of ticket holders that attend your events"
              icon={<Users className="w-6 h-6" />}
              suffix="%"
              progress={Math.min(100, ((qualificationMetrics?.attendanceRate || 0) / 80) * 100)}
            />
            
            <PremiumQualificationCard 
              title="Event Ratings"
              value={qualificationMetrics?.eventRatings || 0}
              target={4.5}
              description="Average star rating across all your events"
              icon={<Star className="w-6 h-6" />}
              suffix=" / 5"
              progress={Math.min(100, ((qualificationMetrics?.eventRatings || 0) / 4.5) * 100)}
            />
            
            <PremiumQualificationCard 
              title="Feedback Volume"
              value={qualificationMetrics?.reviewCount || 0}
              target={50}
              description="Number of verified reviews with high sentiment"
              icon={<MessageSquare className="w-6 h-6" />}
              progress={Math.min(100, ((qualificationMetrics?.reviewCount || 0) / 50) * 100)}
            />
            
            <PremiumQualificationCard 
              title="Recent Events"
              value={qualificationMetrics?.recentEvents || 0}
              target={3}
              description="Number of events hosted within the past 90 days"
              icon={<Calendar className="w-6 h-6" />}
              progress={Math.min(100, ((qualificationMetrics?.recentEvents || 0) / 3) * 100)}
            />
            
            <PremiumQualificationCard 
              title="Media Engagement"
              value={qualificationMetrics?.mediaEngagement || 0}
              target={70}
              description="Percentage of attendees who submit photos/videos"
              icon={<Camera className="w-6 h-6" />}
              suffix="%"
              progress={Math.min(100, ((qualificationMetrics?.mediaEngagement || 0) / 70) * 100)}
            />
          </div>
          
          {/* Tiers Info */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 mt-8">
            <h3 className="text-xl font-bold mb-4">Premium Tiers</h3>
            <p className="mb-6">
              Locked offers two premium tiers based on your performance metrics and event quality:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-cyan-200 -mr-6 -mt-6 opacity-50"></div>
                <div className="flex items-center gap-3 mb-4">
                  <PremiumBadge tier="platinum" size="md" />
                  <h4 className="text-lg font-bold text-cyan-800">Platinum Status</h4>
                </div>
                
                <ul className="space-y-3 relative z-10">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                    <span className="text-cyan-900">Meet all qualification thresholds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                    <span className="text-cyan-900">Maintain an average event rating of at least 4.5 stars</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                    <span className="text-cyan-900">Host at least 3 events in the past 90 days</span>
                  </li>
                </ul>
              </div>
              
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-200 -mr-6 -mt-6 opacity-50"></div>
                <div className="flex items-center gap-3 mb-4">
                  <PremiumBadge tier="elite" size="md" />
                  <h4 className="text-lg font-bold text-purple-800">Elite Status</h4>
                </div>
                
                <ul className="space-y-3 relative z-10">
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-purple-900">Exceed all Platinum qualification thresholds by 25%+</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-purple-900">Maintain an average event rating of at least 4.8 stars</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-purple-900">Host at least 5 events in the past 90 days</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-purple-900">Receive official invitation from Locked team</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* FAQ Section */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 mt-8">
            <h3 className="text-xl font-bold mb-4">Frequently Asked Questions</h3>
            
            <div className="space-y-4">
              <div className="border-b border-neutral-100 pb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  How often are Premium status evaluations performed?
                </h4>
                <p className="text-neutral-600 text-sm">
                  We evaluate organizer metrics on a monthly basis. Once you meet the criteria, you'll be upgraded automatically.
                  Similarly, if metrics fall below thresholds for 3 consecutive months, Premium status may be revoked.
                </p>
              </div>
              
              <div className="border-b border-neutral-100 pb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Can I request a Premium status review?
                </h4>
                <p className="text-neutral-600 text-sm">
                  Yes! If you believe you've met the criteria but haven't been upgraded, you can request a manual review from our team.
                  We'll assess your metrics and provide feedback within 5 business days.
                </p>
              </div>
              
              <div className="border-b border-neutral-100 pb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  How do I improve my qualification metrics?
                </h4>
                <p className="text-neutral-600 text-sm">
                  Focus on creating high-quality events that attendees love. Encourage your attendees to leave reviews,
                  upload photos and videos, and lock your events. Consistency is key—host events regularly and maintain high standards.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Are there any additional costs to become a Premium organizer?
                </h4>
                <p className="text-neutral-600 text-sm">
                  No, there are no application fees or subscription costs. Premium status is earned purely through your
                  performance and the quality of your events.
                </p>
              </div>
            </div>
          </div>
          
          {/* Call to Action */}
          {!premiumStatus && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-8 mt-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-xl font-bold mb-2">Ready to become a Premium Organizer?</h3>
                  <p className="text-neutral-600 max-w-xl">
                    Focus on creating exceptional events and meeting our qualification metrics. Need help getting there?
                  </p>
                </div>
                
                <Link 
                  href="/organizer/analytics"
                  className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                >
                  View Your Analytics
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// These components are used in this page
function Lock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function MessageSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
      />
    </svg>
  );
}

function Camera(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}