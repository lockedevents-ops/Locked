import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { blurPlaceholders } from '@/lib/imageBlurs';

export default function AboutPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16">
      {/* Hero */}
      <section className="lg:flex lg:items-center lg:justify-between mb-12 gap-8">
        <div className="lg:flex-1">
          <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900">About Locked</h1>
          <p className="mt-4 text-neutral-600 max-w-2xl">Locked is a Ghanaian-built events platform that combines discovery, ticketing and audience engagement into a single product. We help organizers publish events, sell tickets, manage check-in, and run audience-driven features such as live voting — all while helping attendees discover great experiences nearby.</p>

          <p className="mt-4 text-neutral-600 max-w-2xl">Founded in 2023, Locked was born from the team's frustration with fragmented tools and manual event workflows. Our goal: provide a modern, reliable platform tailored to the needs of local organizers and communities across Ghana.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pages/help/contact" className="inline-block px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90">Contact us</Link>
            <Link href="/dashboards/organizer/create-event" className="inline-block px-4 py-2 border border-primary text-primary rounded-md text-sm hover:bg-primary/5">Create an event</Link>
          </div>
        </div>

        <div className="hidden lg:block lg:w-1/3">
          <div className="rounded-lg overflow-hidden shadow-sm">
            <Image 
              src="/hero-bg-4.jpg" 
              alt="Events" 
              width={400}
              height={224}
              className="w-full h-56 object-cover"
              priority={true}
              placeholder="blur"
              blurDataURL={blurPlaceholders.eventHero}
            />
          </div>
        </div>
      </section>

      {/* Mission / Vision / Values - more detail */}
      <section className="grid gap-6 md:grid-cols-3 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-neutral-900">Our Mission</h3>
          <p className="mt-3 text-sm text-neutral-600">To remove friction from the events lifecycle — from discovery and ticketing through to on-site operations and post-event engagement — and to provide tools that help local organizers grow sustainably.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-neutral-900">Our Vision</h3>
          <p className="mt-3 text-sm text-neutral-600">An inclusive, thriving events ecosystem across Ghana where creators and communities can easily connect, participate and be rewarded for what they create.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-neutral-900">Our Values</h3>
          <ul className="mt-3 text-sm text-neutral-600 space-y-2 list-disc list-inside">
            <li>Community — we design for the people who make events meaningful.</li>
            <li>Reliability — event-day tools that organizers can depend on.</li>
            <li>Local-first — features and support tailored to Ghanaian workflows.</li>
            <li>Privacy & security — protecting attendee and organizer data is central to everything we build.</li>
          </ul>
        </div>
      </section>

      {/* Story / Timeline */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Our story</h2>
        <div className="prose max-w-none text-neutral-700">
          <p>Locked started as a small side project among a few event organizers and engineers who wanted a simpler way to run events in Ghana. Early prototypes focused on ticketing and check-in; over time we added discovery tools, organizer dashboards and engagement features like voting and raffles.</p>

          <p>We ship small, practical features that solve real organizer problems: faster event setup, clearer attendee communications, and smoother on-site operations. Along the way we partnered with local venues and promoters to iterate quickly and prioritize the features that matter most.</p>
        </div>
      </section>

      {/* Features (detailed) */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Platform features</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <h4 className="font-semibold">Event Management</h4>
            <p className="text-sm text-neutral-600 mt-2">Flexible event creation, ticket types, promo codes, private listings and scheduled publishing — all from a single dashboard.</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <h4 className="font-semibold">Ticketing & Check-in</h4>
            <p className="text-sm text-neutral-600 mt-2">Secure ticket issuance, QR-based check-in, guest lists and simple refund workflows to reduce friction for organizers and attendees.</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <h4 className="font-semibold">Discovery & Promotion</h4>
            <p className="text-sm text-neutral-600 mt-2">Targeted event discovery, category filters, featured placements and shareable pages to help organizers reach the right audiences.</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <h4 className="font-semibold">Audience Engagement</h4>
            <p className="text-sm text-neutral-600 mt-2">Voting, polls and live interactions designed for competitions, talent shows, audience awards and more.</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <h4 className="font-semibold">Analytics & Reporting</h4>
            <p className="text-sm text-neutral-600 mt-2">Organizer dashboards with ticket sales, attendee demographics and basic performance reports to help plan better events.</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <h4 className="font-semibold">Payments & Settlements</h4>
            <p className="text-sm text-neutral-600 mt-2">Integrated payment handling and clear settlement flows for organizers (local payment methods supported where available).</p>
          </div>
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Security & privacy</h2>
        <p className="text-neutral-600 max-w-3xl">We take security seriously. Locked follows industry best practices for data protection, secure communication and access controls. We store only the data we need to operate the service, and we provide organizers with controls over attendee lists and event visibility. For privacy details, see our <Link href="/pages/legal/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
      </section>

      {/* Team (expanded) */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">Meet the team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <Image 
              src="/avatars/avatar-1.png" 
              alt="Mc Lickey" 
              width={80}
              height={80}
              className="mx-auto h-20 w-20 rounded-full object-cover" 
            />
            <p className="mt-3 font-medium">Mc Lickey</p>
            <p className="text-xs text-neutral-500">Co-founder & CEO — product strategy, partnerships and community growth.</p>
          </div>

          <div className="text-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <Image 
              src="/avatars/avatar-2.png" 
              alt="Richard Amenorpe" 
              width={80}
              height={80}
              className="mx-auto h-20 w-20 rounded-full object-cover" 
            />
            <p className="mt-3 font-medium">Richard Amenorpe</p>
            <p className="text-xs text-neutral-500">Head of Product — UX, discovery and organizer workflows.</p>
          </div>

          <div className="text-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <Image 
              src="/avatars/avatar-3.png" 
              alt="Christlieb Dela" 
              width={80}
              height={80}
              className="mx-auto h-20 w-20 rounded-full object-cover" 
            />
            <p className="mt-3 font-medium">Christlieb Dela</p>
            <p className="text-xs text-neutral-500">Lead Developer, Frontend — backend architecture and API integrations.</p>
          </div>

          <div className="text-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <Image 
              src="/avatars/avatar-4.png" 
              alt="TBD." 
              width={80}
              height={80}
              className="mx-auto h-20 w-20 rounded-full object-cover" 
            />
            <p className="mt-3 font-medium">TBD.</p>
            <p className="text-xs text-neutral-500">Community & Partnerships — venue relations and promoter support.</p>
          </div>
        </div>
      </section>

      {/* Partners & community */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-4">Partners & community</h2>
        <p className="text-neutral-600 mb-4">We collaborate with venues, promoters and local communities to ensure our platform meets real-world needs. If you're interested in collaborating, please <Link href="/contact" className="text-primary hover:underline">get in touch</Link>.</p>
        <div className="flex flex-wrap items-center gap-6">
          <Image 
            src="/logo.png" 
            alt="Partner" 
            width={40}
            height={40}
            className="h-10 opacity-80" 
          />
          <Image 
            src="/logo.png" 
            alt="Partner" 
            width={40}
            height={40}
            className="h-10 opacity-80" 
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-neutral-50 p-6 rounded-lg text-center">
        <h3 className="text-lg font-semibold">Ready to host or promote an event?</h3>
        <p className="text-neutral-600 mt-2">Whether you're organizing a small meetup or a large festival, we're here to help you succeed.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/dashboards/organizer/create-event" className="inline-block px-5 py-2 bg-primary text-white rounded-md hover:bg-primary/90">Create an event</Link>
          <Link href="/pages/help/contact" className="inline-block px-5 py-2 border border-neutral-200 rounded-md hover:bg-neutral-100">Contact sales</Link>
        </div>
      </section>
    </main>
  );
}
