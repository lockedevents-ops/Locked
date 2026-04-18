"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle, CalendarPlus, Users, BarChart, Clock, Bell, ChevronDown, HelpCircle, DollarSign, Ticket, Share2, Settings } from "lucide-react";
import { useState } from "react";

export default function EventHostingGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-primary text-white">
        <div className="absolute inset-0 bg-[url('/images/hosting-pattern.png')] opacity-10 mix-blend-overlay" />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 mt-24">Event Hosting Guide</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Create, manage, and promote successful events in Ghana with our powerful event hosting platform.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Creating Memorable Events</h2>
            <div className="prose prose-lg max-w-none text-neutral-700">
              <p>
                Locked provides everything you need to host successful events in Ghana. From small meetups to large-scale 
                festivals, our platform helps you manage every aspect of your event with powerful tools designed for 
                organizers of all experience levels.
              </p>
              <p>
                This guide will walk you through the process of creating and managing events on Locked, helping you 
                maximize attendance, streamline operations, and create unforgettable experiences for your attendees.
              </p>
            </div>
            
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              <div className="bg-neutral-50 p-6 rounded-xl">
                <CalendarPlus className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Simple Setup</h3>
                <p className="text-neutral-600">
                  Create professional event listings in minutes with our intuitive event creation tools.
                </p>
              </div>
              
              <div className="bg-neutral-50 p-6 rounded-xl">
                <Ticket className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ticket Management</h3>
                <p className="text-neutral-600">
                  Sell tickets, track sales, and manage attendee information all in one place.
                </p>
              </div>
              
              <div className="bg-neutral-50 p-6 rounded-xl">
                <BarChart className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Insightful Analytics</h3>
                <p className="text-neutral-600">
                  Gain valuable insights with detailed attendance reports and performance metrics.
                </p>
              </div>
            </div>
          </section>

          {/* Getting Started */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Getting Started as an Event Host</h2>
            
            <div className="relative border-l-4 border-primary/20 pl-8 space-y-12 ml-4">
              {/* Step 1 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">1</div>
                <h3 className="text-2xl font-semibold mb-3">Create an Organizer Account</h3>
                <p className="text-neutral-600 mb-4">
                  To host events on Locked, you'll need to create an organizer account that gives you access to our event management tools.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-neutral-600 ml-4">
                  <li>Sign up for a Locked account or log in to your existing account</li>
                  <li>Go to your profile settings and select "Become an Organizer"</li>
                  <li>Fill out the required information about your organization</li>
                  <li>Submit any required verification documents</li>
                  <li>Wait for approval (typically 1-3 business days)</li>
                </ol>
                
                <div className="bg-neutral-50 p-4 rounded-lg mt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 bg-blue-100 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-blue-700">
                      While your organizer application is being reviewed, you can still use Locked as a regular user.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">2</div>
                <h3 className="text-2xl font-semibold mb-3">Create Your First Event</h3>
                <p className="text-neutral-600 mb-4">
                  Once your organizer account is approved, you can start creating events. Our intuitive event creation interface walks you through every step.
                </p>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <Image 
                      src="/images/event-creation-dashboard.jpg" 
                      width={700} 
                      height={350}
                      alt="Event creation dashboard"
                      className="w-full object-cover"
                    />
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-neutral-600 ml-4">
                    <li>Navigate to your Organizer Dashboard</li>
                    <li>Click "Create Event" to start the process</li>
                    <li>Fill out the basic event details:
                      <ul className="list-disc list-inside ml-8 mt-2">
                        <li>Event title and description</li>
                        <li>Date, time, and duration</li>
                        <li>Location (physical venue or online)</li>
                        <li>Event category and type</li>
                      </ul>
                    </li>
                    <li>Upload high-quality event images</li>
                    <li>Set up your event schedule and program</li>
                  </ol>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">3</div>
                <h3 className="text-2xl font-semibold mb-3">Configure Tickets and Pricing</h3>
                <p className="text-neutral-600 mb-4">
                  Create different ticket types with varied pricing to accommodate different attendee needs and maximize your sales.
                </p>
                <div className="bg-neutral-50 p-5 rounded-lg mb-4">
                  <h4 className="font-semibold text-lg mb-3">Ticket Types</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 pb-3 border-b border-neutral-200">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Ticket className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">General Admission</p>
                        <p className="text-sm text-neutral-600">Standard access to your event</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pb-3 border-b border-neutral-200">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">VIP Access</p>
                        <p className="text-sm text-neutral-600">Premium experience with added benefits</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Group Packages</p>
                        <p className="text-sm text-neutral-600">Discounted rates for groups</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-neutral-600 ml-4">
                  <p>Additional ticket options to consider:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Early bird discounts</li>
                    <li>Tiered pricing based on dates</li>
                    <li>Bundle packages with merchandise</li>
                    <li>Free tickets for promotional purposes</li>
                    <li>Student or senior discounts</li>
                  </ul>
                </div>
              </div>
              
              {/* Step 4 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">4</div>
                <h3 className="text-2xl font-semibold mb-3">Promote Your Event</h3>
                <p className="text-neutral-600 mb-4">
                  Use our built-in promotion tools and integrations to spread the word about your event and increase ticket sales.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="border border-neutral-200 p-4 rounded-lg bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <Share2 className="text-primary w-5 h-5" />
                      <h4 className="font-semibold">Social Media Sharing</h4>
                    </div>
                    <p className="text-sm text-neutral-600">
                      Easily share your event on all major social platforms with our one-click sharing tools.
                    </p>
                  </div>
                  
                  <div className="border border-neutral-200 p-4 rounded-lg bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <Bell className="text-primary w-5 h-5" />
                      <h4 className="font-semibold">Email Campaigns</h4>
                    </div>
                    <p className="text-sm text-neutral-600">
                      Notify your contact list about your upcoming event with customizable email templates.
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <p className="text-neutral-600">Other promotion options:</p>
                  <ul className="list-disc list-inside space-y-2 text-neutral-600 ml-4">
                    <li>Featured event placement on Locked's discover page</li>
                    <li>Discounted early bird tickets to drive initial sales</li>
                    <li>Affiliate programs for influencers and partners</li>
                    <li>QR codes for print materials that link directly to your event page</li>
                  </ul>
                </div>
              </div>
              
              {/* Step 5 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">5</div>
                <h3 className="text-2xl font-semibold mb-3">Manage Your Event</h3>
                <p className="text-neutral-600 mb-4">
                  Our organizer dashboard gives you all the tools you need to manage attendees, track sales, and update event details.
                </p>
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <Image 
                    src="/images/organizer-dashboard.jpg" 
                    width={700} 
                    height={350}
                    alt="Organizer dashboard"
                    className="w-full object-cover"
                  />
                </div>
                
                <div className="mt-4 space-y-4">
                  <p className="text-neutral-600">Key management features:</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h5 className="font-medium mb-2">Attendee Management</h5>
                      <ul className="list-disc list-inside text-sm text-neutral-600">
                        <li>View and export attendee lists</li>
                        <li>Send updates to registered attendees</li>
                        <li>Process refunds if necessary</li>
                        <li>Check-in tools for event day</li>
                      </ul>
                    </div>
                    
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h5 className="font-medium mb-2">Sales Tracking</h5>
                      <ul className="list-disc list-inside text-sm text-neutral-600">
                        <li>Real-time sales dashboards</li>
                        <li>Revenue reports and projections</li>
                        <li>Ticket type performance</li>
                        <li>Marketing campaign effectiveness</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Step 6 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">6</div>
                <h3 className="text-2xl font-semibold mb-3">Post-Event Follow Up</h3>
                <p className="text-neutral-600 mb-4">
                  After your event concludes, use our tools to gather feedback, analyze performance, and plan for future events.
                </p>
                <div className="space-y-4">
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Attendee Feedback</h4>
                    <p className="text-neutral-600 mb-2">Send automated post-event surveys to gather valuable feedback from attendees.</p>
                    <div className="flex items-center gap-2 text-primary">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Surveys automatically sent 24 hours after event completion</span>
                    </div>
                  </div>
                  
                  <div className="bg-neutral-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Performance Analytics</h4>
                    <p className="text-neutral-600">Review comprehensive reports on:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-neutral-600">
                      <li>Total attendance and no-shows</li>
                      <li>Revenue breakdown by ticket type</li>
                      <li>Marketing channel performance</li>
                      <li>Attendee demographics</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-neutral-600">
                    Use these insights to improve your future events and build on your success.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Best Practices for Successful Events</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>Timing is Everything</span>
                </h3>
                <p className="text-neutral-600 mb-4">
                  Choose your event date and time strategically. Consider competing events, holidays, and typical work schedules.
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-600">
                  <li>Research major events in your area to avoid conflicts</li>
                  <li>Consider weekday evenings for professional events</li>
                  <li>Weekend afternoons/evenings work well for social events</li>
                  <li>Allow enough lead time for promotion (at least 3-4 weeks)</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span>Strategic Pricing</span>
                </h3>
                <p className="text-neutral-600 mb-4">
                  Set prices that reflect your event's value while remaining accessible to your target audience.
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-600">
                  <li>Research similar events to benchmark pricing</li>
                  <li>Create tiered options for different budgets</li>
                  <li>Use early bird pricing to drive early sales</li>
                  <li>Consider group discounts to boost attendance</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Image 
                    src="/images/camera-icon.svg" 
                    width={20} 
                    height={20} 
                    alt="Camera icon" 
                    className="text-primary"
                  />
                  <span>Compelling Visuals</span>
                </h3>
                <p className="text-neutral-600 mb-4">
                  High-quality images significantly increase event page engagement and ticket sales.
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-600">
                  <li>Use professional, high-resolution images</li>
                  <li>Include photos from previous events if available</li>
                  <li>Feature speakers, performers, or venue images</li>
                  <li>Create branded graphics for social media promotion</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span>Attendee Experience</span>
                </h3>
                <p className="text-neutral-600 mb-4">
                  Focus on creating a seamless experience from registration through to the event's conclusion.
                </p>
                <ul className="list-disc list-inside space-y-2 text-neutral-600">
                  <li>Send clear pre-event instructions and reminders</li>
                  <li>Streamline the check-in process with digital tickets</li>
                  <li>Consider the flow of your event layout and schedule</li>
                  <li>Gather feedback to continuously improve</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Advanced Features Section */}
          <section className="mb-16 bg-neutral-50 p-8 rounded-xl border border-neutral-100">
            <h2 className="text-3xl font-bold mb-6">Advanced Event Features</h2>
            <p className="text-neutral-600 mb-8">
              Elevate your events with our advanced features designed to enhance attendee engagement and provide additional revenue opportunities.
            </p>
            
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 flex justify-center">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 h-fit">
                    <Image 
                      src="/images/voting-feature.jpg" 
                      width={250} 
                      height={150}
                      alt="Voting feature"
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                </div>
                
                <div className="md:w-2/3">
                  <h3 className="text-xl font-semibold mb-3">Interactive Voting</h3>
                  <p className="text-neutral-600 mb-4">
                    Add audience voting capabilities to your events such as pageants, award ceremonies, or talent shows. Attendees can vote for their favorites directly through the platform.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-neutral-600">
                    <li>Configure voting categories and contestants</li>
                    <li>Set voting periods and pricing</li>
                    <li>Display real-time or delayed results</li>
                    <li>Create additional revenue streams through paid votes</li>
                  </ul>
                  <Link href="/pages/guides/voting" className="inline-flex items-center gap-2 text-primary font-medium mt-4 hover:text-primary-dark">
                    Learn more about event voting
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 flex justify-center md:order-2">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 h-fit">
                    <Image 
                      src="/images/seating-chart.jpg" 
                      width={250} 
                      height={150}
                      alt="Seating chart feature"
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                </div>
                
                <div className="md:w-2/3 md:order-1">
                  <h3 className="text-xl font-semibold mb-3">Reserved Seating</h3>
                  <p className="text-neutral-600 mb-4">
                    For events with assigned seating, our interactive seating chart feature allows attendees to select their preferred seats during checkout.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-neutral-600">
                    <li>Create custom seating charts for your venue</li>
                    <li>Set different pricing by seating zone</li>
                    <li>Allow attendees to see available seats in real-time</li>
                    <li>Manage group seating arrangements</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              {[
                {
                  question: "What types of events can I host on Locked?",
                  answer: "Locked supports a wide range of events including concerts, conferences, workshops, networking events, cultural celebrations, fundraisers, sporting events, and more. Our platform is flexible enough to accommodate both small gatherings and large-scale productions."
                },
                {
                  question: "How long does it take to get organizer approval?",
                  answer: "Most organizer applications are approved within 1-3 business days. Complex applications or those requiring additional verification may take longer. You'll receive email notifications about your application status throughout the process."
                },
                {
                  question: "What fees does Locked charge event organizers?",
                  answer: "Locked charges a service fee of 5% of the ticket price plus a fixed fee of ₵1 per ticket sold. These fees help us maintain the platform and provide comprehensive support to organizers and attendees. You can choose to absorb these fees or pass them on to ticket buyers."
                },
                {
                  question: "When do I receive payments for my ticket sales?",
                  answer: "For established organizers, funds are typically disbursed within 5-7 business days after your event concludes. New organizers may have a 14-day holding period for their first few events. You can view your pending and processed payouts in your Organizer Dashboard."
                },
                {
                  question: "Can I offer refunds to attendees?",
                  answer: "Yes, you have complete control over your refund policy. You can set custom refund rules during event creation, such as allowing full refunds up to 7 days before the event, partial refunds closer to the event date, or no refunds. You can also process manual refunds on a case-by-case basis."
                },
                {
                  question: "How can I track the performance of my event?",
                  answer: "Your Organizer Dashboard provides comprehensive analytics including ticket sales over time, revenue breakdowns, attendee demographics, marketing channel effectiveness, and more. You can export these reports for further analysis or sharing with stakeholders."
                },
              ].map((faq, index) => (
                <div 
                  key={index}
                  className="border border-neutral-200 rounded-lg overflow-hidden"
                >
                  <button 
                    className="w-full flex justify-between items-center p-4 text-left bg-white hover:bg-neutral-50 focus:outline-none"
                    onClick={() => toggleFaq(index)}
                  >
                    <span className="font-medium">{faq.question}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-neutral-500 transition-transform ${
                        openFaq === index ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                  
                  {openFaq === index && (
                    <div className="p-4 bg-neutral-50 border-t border-neutral-200">
                      <p className="text-neutral-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Need More Help */}
          <section className="bg-primary/5 border border-primary/10 rounded-xl p-8 text-center">
            <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Need More Help?</h2>
            <p className="text-neutral-600 mb-6 max-w-xl mx-auto">
              Our team is ready to assist you with any questions about organizing events on Locked.
              We're committed to helping you create successful events.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/contact" className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors">
                Contact Support
              </Link>
              <Link href="/organizer/resources" className="bg-white border border-neutral-200 text-neutral-700 px-6 py-2.5 rounded-lg font-medium hover:bg-neutral-50 transition-colors">
                Organizer Resources
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}