"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Search, CreditCard, Calendar, ChevronDown, HelpCircle, Clock, Ticket, Download, Phone, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function EventBookingGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-primary text-white">
        <div className="container mx-auto px-4 py-16 relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 mt-24">Event Booking Guide</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Learn how to discover, book, and attend events in Ghana with our simple step-by-step guide.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Finding and Booking Events</h2>
            <div className="prose prose-lg max-w-none text-neutral-700">
              <p>
                Locked makes it easy to discover events across Ghana and secure your spot with just a few clicks. 
                Whether you're looking for concerts, conferences, cultural celebrations, or networking opportunities, 
                our platform connects you with exciting experiences happening near you.
              </p>
              <p>
                This guide will walk you through everything you need to know about finding events that match your interests, 
                booking tickets, and managing your reservations on Locked.
              </p>
            </div>
            
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              <div className="bg-neutral-50 p-6 rounded-xl">
                <Search className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Easy Discovery</h3>
                <p className="text-neutral-600">
                  Find events by category, location, date, or search for specific keywords.
                </p>
              </div>
              
              <div className="bg-neutral-50 p-6 rounded-xl">
                <Ticket className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Secure Booking</h3>
                <p className="text-neutral-600">
                  Book tickets quickly with our safe and hassle-free payment system.
                </p>
              </div>
              
              <div className="bg-neutral-50 p-6 rounded-xl">
                <Calendar className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Easy Management</h3>
                <p className="text-neutral-600">
                  Access and organize all your tickets in one place with digital ticket delivery.
                </p>
              </div>
            </div>
          </section>

          {/* How to Book Events */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">How to Book Events</h2>
            
            <div className="relative border-l-4 border-primary/20 pl-8 space-y-12 ml-4">
              {/* Step 1 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">1</div>
                <h3 className="text-2xl font-semibold mb-3">Find Your Event</h3>
                <p className="text-neutral-600 mb-4">
                  Use our search and discovery features to find the perfect event for you.
                </p>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <Image 
                      src="/guides/booking/event-discovery.png" 
                      width={700} 
                      height={350}
                      alt="Event discovery page showing various events"
                      className="w-full object-cover"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Browse by Category</h4>
                      <p className="text-sm text-neutral-600">
                        Filter events by music, conferences, arts & culture, food & drink, sports, and more.
                      </p>
                    </div>
                    
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Search Features</h4>
                      <p className="text-sm text-neutral-600">
                        Use the search bar to find events by name, venue, or organizer.
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                    <p className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <strong>Pro Tip:</strong> Use filters to narrow results by date, price range, location, and more.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">2</div>
                <h3 className="text-2xl font-semibold mb-3">Review Event Details</h3>
                <p className="text-neutral-600 mb-4">
                  Get all the information you need before making your booking.
                </p>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <Image 
                      src="/guides/booking/event-details.png" 
                      width={700} 
                      height={350}
                      alt="Event details page showing event information"
                      className="w-full object-cover"
                    />
                  </div>
                  
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <span className="text-neutral-600">
                        <strong className="text-neutral-800">Event Description:</strong> Learn what the event is about and what to expect.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <span className="text-neutral-600">
                        <strong className="text-neutral-800">Date & Time:</strong> Check when the event is happening and plan accordingly.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <span className="text-neutral-600">
                        <strong className="text-neutral-800">Location:</strong> See where the event is taking place with maps and directions.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <span className="text-neutral-600">
                        <strong className="text-neutral-800">Organizer Info:</strong> Learn about who's hosting the event.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <span className="text-neutral-600">
                        <strong className="text-neutral-800">Ticket Types & Pricing:</strong> Compare available ticket options and prices.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">3</div>
                <h3 className="text-2xl font-semibold mb-3">Select Ticket Type & Quantity</h3>
                <p className="text-neutral-600 mb-4">
                  Choose the right ticket option that suits your needs and preferences.
                </p>
                
                <div className="bg-neutral-50 p-5 rounded-lg mb-4">
                  <h4 className="font-semibold text-lg mb-3">Common Ticket Types</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 pb-3 border-b border-neutral-200">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Ticket className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">General Admission</p>
                        <p className="text-sm text-neutral-600">Standard entry to the event</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pb-3 border-b border-neutral-200">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">VIP</p>
                        <p className="text-sm text-neutral-600">Premium experience with added benefits</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Group Tickets</p>
                        <p className="text-sm text-neutral-600">Discounted rates for multiple attendees</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700">
                  <p className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      <strong>Early Bird Offers:</strong> Many events have limited-time discounted tickets available. Book early to save!
                    </span>
                  </p>
                </div>
              </div>
              
              {/* Step 4 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">4</div>
                <h3 className="text-2xl font-semibold mb-3">Complete Payment</h3>
                <p className="text-neutral-600 mb-4">
                  Pay securely using your preferred payment method.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="border border-neutral-200 p-4 rounded-lg bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <Phone className="text-primary w-5 h-5" />
                      <h4 className="font-semibold">Mobile Money</h4>
                    </div>
                    <div className="space-y-2 text-sm text-neutral-600">
                      <p>Pay using your MTN, Telecel, or AirtelTigo mobile money account.</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Enter your mobile number</li>
                        <li>Confirm the payment on your phone</li>
                        <li>Receive your ticket confirmation</li>
                      </ol>
                    </div>
                  </div>
                  
                  <div className="border border-neutral-200 p-4 rounded-lg bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <CreditCard className="text-primary w-5 h-5" />
                      <h4 className="font-semibold">Credit/Debit Card</h4>
                    </div>
                    <div className="space-y-2 text-sm text-neutral-600">
                      <p>Pay using any Visa, Mastercard, or other supported card.</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Enter your card details securely</li>
                        <li>Complete the payment process</li>
                        <li>Receive your ticket confirmation</li>
                      </ol>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-100 rounded-lg mt-4 text-sm text-green-700">
                  <p className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>
                      <strong>Secure Transactions:</strong> All payments are processed securely using industry-standard encryption.
                    </span>
                  </p>
                </div>
              </div>
              
              {/* Step 5 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">5</div>
                <h3 className="text-2xl font-semibold mb-3">Receive & Manage Your Tickets</h3>
                <p className="text-neutral-600 mb-4">
                  Access your tickets anytime from your Locked account.
                </p>
                
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <Image 
                    src="/guides/booking/ticket-management.png" 
                    width={700} 
                    height={350}
                    alt="Ticket management interface"
                    className="w-full object-cover"
                  />
                </div>
                
                <div className="mt-4 space-y-4">
                  <p className="text-neutral-600">After successful payment, your tickets will be:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <span className="text-neutral-600">
                        <strong className="text-neutral-800">Emailed to you</strong> as PDF attachments
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <span className="text-neutral-600">
                        <strong className="text-neutral-800">Available in your account</strong> under "My Tickets"
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <span className="text-neutral-600">
                        <strong className="text-neutral-800">Accessible offline</strong> once downloaded
                      </span>
                    </li>
                  </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg flex-1">
                    <h4 className="font-medium mb-2 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-primary" />
                      <span>Download Options</span>
                    </h4>
                    <p className="text-sm text-neutral-600">
                      Save your tickets as PDFs or add them directly to your phone's wallet app.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg flex-1">
                    <h4 className="font-medium mb-2 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span>Share Tickets</span>
                    </h4>
                    <p className="text-sm text-neutral-600">
                      Easily transfer tickets to friends and family from your account.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Step 6 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">6</div>
                <h3 className="text-2xl font-semibold mb-3">Attend the Event</h3>
                <p className="text-neutral-600 mb-4">
                  Make the most of your event experience with these tips.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-neutral-200 p-4 rounded-lg bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="text-primary w-5 h-5" />
                      <h4 className="font-semibold">Before the Event</h4>
                    </div>
                    <ul className="space-y-1.5 text-sm text-neutral-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Check for any pre-event communications from the organizer</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Ensure your tickets are accessible on your phone</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Plan your route to the venue in advance</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Check the event page for any special instructions</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="border border-neutral-200 p-4 rounded-lg bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="text-primary w-5 h-5" />
                      <h4 className="font-semibold">On Event Day</h4>
                    </div>
                    <ul className="space-y-1.5 text-sm text-neutral-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Arrive with enough time for entry procedures</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Have your digital or printed tickets ready</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Bring valid ID if the event requires age verification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Check in at the registration desk or entry point</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Managing Your Bookings */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Managing Your Bookings</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Your Bookings</span>
                </h3>
                <p className="text-neutral-600 mb-4">
                  Access all your upcoming and past event bookings in one place.
                </p>
                <ul className="space-y-2 text-neutral-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Log in to your Locked account</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Go to "My Tickets" in your dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>View all upcoming and past events</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>Access ticket details and barcodes</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refunds & Cancellations</span>
                </h3>
                <p className="text-neutral-600 mb-4">
                  Understand the refund policy and how to request cancellations when needed.
                </p>
                <div className="space-y-3 text-neutral-600">
                  <p>Refund policies vary by event. Generally:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Check the specific event's refund policy on the event page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>To request a refund, go to "My Tickets" and select the event</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Click "Request Refund" and follow the instructions</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Event Changes</span>
                </h3>
                <p className="text-neutral-600 mb-4">
                  Stay informed about any changes to your booked events.
                </p>
                <ul className="space-y-2 text-neutral-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>You'll receive email notifications if there are any changes to your booked events</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Check event details in your account for the most up-to-date information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>For significant changes, you'll usually be offered options (attend, refund, etc.)</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Transferring Tickets</span>
                </h3>
                <p className="text-neutral-600 mb-4">
                  Send tickets to friends or family members when you can't attend.
                </p>
                <ol className="space-y-2 text-neutral-600 list-decimal list-inside">
                  <li>Go to "My Tickets" in your account</li>
                  <li>Select the event you want to transfer</li>
                  <li>Click on "Transfer Ticket"</li>
                  <li>Enter the recipient's email address</li>
                  <li>They'll receive an email to claim the ticket</li>
                </ol>
                <p className="text-sm text-neutral-500 mt-2">
                  Note: Some events may have restrictions on ticket transfers
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              {[
                {
                  question: "Can I purchase tickets without creating an account?",
                  answer: "No, you'll need to create a Locked account to book tickets. This helps us provide a secure booking experience and gives you access to your tickets anytime. Creating an account is free and only takes a minute."
                },
                {
                  question: "How do I get my tickets after purchase?",
                  answer: "After completing your purchase, tickets are immediately available in your Locked account under 'My Tickets.' You'll also receive an email confirmation with a PDF version of your tickets attached. You can present either digital or printed tickets at the event."
                },
                {
                  question: "What payment methods are accepted?",
                  answer: "We accept Mobile Money (MTN, Telecel, AirtelTigo), credit/debit cards (Visa, Mastercard), and bank transfers for some events. The available payment options will be shown at checkout."
                },
                {
                  question: "Can I get a refund if I can't attend an event?",
                  answer: "Refund policies are set by event organizers and vary by event. Check the specific event's refund policy on its details page. If refunds are allowed, you can request one from your account under 'My Tickets.' For non-refundable events, you may still have the option to transfer your ticket to someone else."
                },
                {
                  question: "What happens if an event is canceled or rescheduled?",
                  answer: "If an event is canceled, you'll be automatically refunded through your original payment method. For rescheduled events, your tickets will remain valid for the new date. You'll be notified via email about any changes, and you'll typically have the option to request a refund if you can't make the new date."
                },
                {
                  question: "Can I transfer my ticket to someone else?",
                  answer: "Yes, most tickets can be transferred to another person. In your account, go to 'My Tickets,' select the event, and click 'Transfer Ticket.' Enter the recipient's email address, and they'll receive instructions to claim the ticket. Note that some events may have restrictions on transfers."
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
              If you have additional questions about booking or need assistance with your tickets,
              our support team is ready to help.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/pages/contact" className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors">
                Contact Support
              </Link>
              <Link href="/pages/faqs" className="bg-white border border-neutral-200 text-neutral-700 px-6 py-2.5 rounded-lg font-medium hover:bg-neutral-50 transition-colors">
                Browse FAQs
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}