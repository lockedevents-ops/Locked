"use client";

import { OrganizerCard } from '@/components/organizers/OrganizerCard';
import { Trophy } from 'lucide-react';

// Sample data for testing
const sampleOrganizers = [
  {
    id: '1',
    name: 'John Akufo',
    image: '/placeholder-profile.jpg',
    location: 'Accra, Ghana',
    bio: 'Passionate event organizer creating memorable tech conferences and community meetups across Ghana.',
    verified: true,
    verificationStatus: 'verified',
    eventsHosted: 24,
    followersCount: 1250,
    totalScore: 95.5,
    rank: 1
  },
  {
    id: '2',
    name: 'Sarah Mensah',
    image: '/placeholder-profile.jpg',
    location: 'Kumasi, Ghana',
    bio: 'Creative director specializing in arts and culture events, bringing unique experiences to life.',
    verified: true,
    verificationStatus: 'verified',
    eventsHosted: 18,
    followersCount: 980,
    totalScore: 87.2,
    rank: 2
  },
  {
    id: '3',
    name: 'Michael Osei',
    image: '/placeholder-profile.jpg',
    location: 'Tamale, Ghana',
    bio: 'Business conference organizer with expertise in networking events and professional development.',
    verified: false,
    verificationStatus: 'pending',
    eventsHosted: 15,
    followersCount: 720,
    totalScore: 78.9,
    rank: 3
  }
];

export default function TestOrganizersPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-left mb-12">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary uppercase tracking-wide">Top Performers</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Leading Event Organizers
          </h1>
          <p className="text-gray-600 max-w-3xl text-lg">
            Discover the most successful event organizers in Ghana, ranked by events hosted and community engagement.
            Each organizer is recognized with distinctive Elite, Platinum, and Gold themed cards.
          </p>
        </div>

        {/* Top 3 Organizers Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {sampleOrganizers.map((organizer) => (
            <OrganizerCard 
              key={organizer.id}
              organizer={organizer}
              showRanking={true}
              className="w-full"
            />
          ))}
        </div>

        {/* Design Features */}
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Design Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Pill-shaped Badges</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Elite badge with Crown icon for #1</li>
                <li>• Platinum badge with Trophy icon for #2</li>
                <li>• Gold badge with Award icon for #3</li>
                <li>• Clean, modern pill design with gradient backgrounds</li>
                <li>• Positioned top-right to avoid profile image overlap</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Themed Cards</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Indigo/Purple gradient background for Elite (#1)</li>
                <li>• Cyan/Blue gradient background for Platinum (#2)</li>
                <li>• Amber/Gold gradient background for #3</li>
                <li>• Distinctive colors and enhanced shadows for each rank</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Regular Cards (No ranking) */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Regular Organizer Cards</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {sampleOrganizers.map((organizer) => (
              <OrganizerCard 
                key={`regular-${organizer.id}`}
                organizer={{...organizer, rank: undefined}}
                showRanking={false}
                className="w-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
