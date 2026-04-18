"use client";

import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, HelpCircle, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

// FAQ Categories and their counts
const categories = [
  { id: 'all', name: 'All Topics', count: 24 },
  { id: 'booking', name: 'Booking & Reservations', count: 4 },
  { id: 'payments', name: 'Payments & Pricing', count: 4 },
  { id: 'events', name: 'Event Hosting', count: 4 },
  { id: 'account', name: 'Account Management', count: 4 },
  { id: 'security', name: 'Privacy & Security', count: 4 },
  { id: 'voting', name: 'Voting System', count: 4 }
];

// FAQ Data organized by categories
const faqData = {
  popular: [
    {
      question: "How do I book tickets for an event?",
      answer: "You can book tickets by visiting the event page, selecting your preferred ticket type, and following the checkout process. You'll receive a confirmation email with your tickets once payment is complete.",
      category: "booking"
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit/debit cards, Mobile Money (MTN, Telecel, AirtelTigo), and bank transfers for certain events. All payments are processed securely through our payment gateway.",
      category: "payments"
    },
    {
      question: "How does the voting system work?",
      answer: "Our voting system allows event attendees to support their favorite contestants by casting votes. Each vote costs a small fee, which helps support both the event organizers and the contestants. You can vote multiple times for your favorites.",
      category: "voting"
    }
  ],
  booking: [
    {
      question: "How do I book tickets for an event?",
      answer: "You can book tickets by visiting the event page, selecting your preferred ticket type, and following the checkout process. You'll receive a confirmation email with your tickets once payment is complete."
    },
    {
      question: "Can I cancel or transfer my tickets?",
      answer: "Cancellation policies vary by event. Some events allow cancellations up to 24 hours before, while others have no-refund policies. Ticket transfers are generally allowed through our platform by using the 'Transfer Ticket' feature in your account dashboard."
    },
    {
      question: "How do I access my tickets?",
      answer: "Your tickets are available in the 'My Tickets' section of your account dashboard. You can display the QR code directly from your mobile device or print your tickets. Each ticket has a unique code that will be scanned at entry."
    },
    {
      question: "What if an event is postponed or canceled?",
      answer: "If an event is postponed, your tickets will automatically be valid for the new date. If canceled, you'll receive a full refund to your original payment method within 5-7 business days. You'll be notified by email in either case."
    }
  ],
  payments: [
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit/debit cards, Mobile Money (MTN, Telecel, AirtelTigo), and bank transfers for certain events. All payments are processed securely through our payment gateway."
    },
    {
      question: "When will I be charged for my booking?",
      answer: "You'll be charged immediately upon completing your booking. For events with installment payment options, the initial deposit will be charged immediately with remaining payments processed according to the payment schedule."
    },
    {
      question: "Are there any additional fees?",
      answer: "There is a small service fee added to ticket prices to cover processing costs. This fee is clearly displayed during checkout before you confirm your purchase. Some premium events may have additional charges for special services."
    },
    {
      question: "How do refunds work?",
      answer: "Refunds are processed back to the original payment method. Processing time varies between 3-14 business days depending on your payment provider. Refund policies vary by event, so please check the specific event's terms before purchasing."
    }
  ],
  events: [
    {
      question: "How do I create an event on the platform?",
      answer: "To create an event, sign up for an Organizer account, then use the 'Create Event' button on your dashboard. Fill in all required details including date, time, venue, ticket types, and pricing. Once submitted, our team will review and approve your event within 24 hours."
    },
    {
      question: "What fees does Locked charge event organizers?",
      answer: "Locked charges a 5% platform fee plus a 2.5% payment processing fee on all ticket sales. Premium features like featured placement, advanced analytics, and voting systems may have additional costs that will be clearly outlined."
    },
    {
      question: "Can I edit my event after publishing?",
      answer: "Yes, you can edit most event details until tickets start selling. Once tickets have been sold, certain changes (date, venue, time) will require approval and may trigger notifications to ticket holders."
    },
    {
      question: "How do I get paid for ticket sales?",
      answer: "Payments are transferred to your registered bank account or mobile money wallet 3 business days after your event concludes. For major events, you may request partial settlements before the event date."
    }
  ],
  account: [
    {
      question: "How do I create an account?",
      answer: "Click the 'Sign Up' button in the top right corner of the website. You can sign up using your email, or through Google or Facebook authentication. Follow the prompts to complete your profile information."
    },
    {
      question: "Can I have both attendee and organizer accounts?",
      answer: "Yes, you can switch between attendee and organizer views within the same account. Go to your account settings and enable organizer features to access event creation and management tools."
    },
    {
      question: "How do I reset my password?",
      answer: "Click 'Sign In', then select 'Forgot Password'. Enter the email associated with your account, and we'll send you a link to reset your password. The link is valid for 24 hours."
    },
    {
      question: "Can I delete my account?",
      answer: "Yes, you can delete your account from the account settings page. Note that this will cancel any upcoming ticket reservations and remove all your data from our system according to our Privacy Policy."
    }
  ],
  security: [
    {
      question: "How is my personal information protected?",
      answer: "We use industry-standard encryption and security practices to protect your data. Your payment information is never stored on our servers and is processed through secure payment gateways that comply with PCI DSS standards."
    },
    {
      question: "Are my tickets transferable?",
      answer: "Yes, most tickets can be transferred to another person through our platform. Some high-security events may have restrictions on transfers or require additional verification."
    },
    {
      question: "What measures do you take to prevent ticket fraud?",
      answer: "Each ticket contains a unique QR code that can only be scanned once for entry. Our system updates in real-time when a ticket is used, preventing duplicate tickets. We also monitor for suspicious purchasing patterns."
    },
    {
      question: "Can I use biometric login for added security?",
      answer: "Yes, if your device supports biometric authentication (fingerprint or face recognition), you can enable this feature in your account settings for faster and more secure login."
    }
  ],
  voting: [
    {
      question: "How does the voting system work?",
      answer: "Our voting system allows event attendees to support their favorite contestants by casting votes. Each vote costs a small fee, which helps support both the event organizers and the contestants. You can vote multiple times for your favorites."
    },
    {
      question: "Can I vote for multiple contestants?",
      answer: "Yes, you can distribute your votes among different contestants if you wish. Each vote is counted separately, so you have complete flexibility in how you support your favorites."
    },
    {
      question: "Are votes refundable?",
      answer: "Votes are non-refundable once cast, as they are immediately counted toward your chosen contestant's total. Make sure you're voting for the correct contestant before confirming."
    },
    {
      question: "How secure is the voting system?",
      answer: "Our voting system uses secure payment processing and has measures in place to prevent fraudulent voting. Each vote is verified and counted accurately, with real-time updates and transparent tallying."
    }
  ]
};

export default function FAQsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});
  type FaqItem = { question: string; answer: string; category?: string };
  type FaqsByCategory = {
    [key: string]: FaqItem[];
    popular: FaqItem[];
    booking: FaqItem[];
    payments: FaqItem[];
    events: FaqItem[];
    account: FaqItem[];
    security: FaqItem[];
    voting: FaqItem[];
  };
  const [filteredFaqs, setFilteredFaqs] = useState<FaqsByCategory>(faqData);

  // Handle category selection
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setSearchTerm('');
  };

  // Handle search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredFaqs(faqData);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const results: FaqsByCategory = {
      popular: [],
      booking: [],
      payments: [],
      events: [],
      account: [],
      security: [],
      voting: [],
    };

    Object.keys(faqData).forEach((category) => {
      if (
        category === "popular" ||
        category === "booking" ||
        category === "payments" ||
        category === "events" ||
        category === "account" ||
        category === "security" ||
        category === "voting"
      ) {
        results[category] = faqData[category].filter(
          (faq: FaqItem) =>
            faq.question.toLowerCase().includes(term) ||
            faq.answer.toLowerCase().includes(term)
        );
      }
    });

    setFilteredFaqs(results);
  }, [searchTerm]);

  // Toggle FAQ
  const toggleFaq = (categoryId: string, index: number) => {
    const key = `${categoryId}-${index}`;
    setOpenFaqs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-primary text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4 mt-24">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
              <HelpCircle size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 ">Frequently Asked Questions</h1>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Find answers to common questions about Locked. Can't find what you're looking for? 
            Our support team is here to help.
          </p>
          
          {/* Search Box */}
          <div className="max-w-xl mx-auto relative">
            <div className="bg-white rounded-full shadow-lg flex items-center px-4 py-2">
              <Search className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search for answers..."
                className="flex-grow bg-transparent outline-none text-gray-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Clear search</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="overflow-x-auto py-4">
            <div className="flex min-w-max space-x-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`flex items-center px-4 py-2 rounded-full transition-colors ${
                    activeCategory === category.id
                      ? 'bg-primary text-white font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{category.name}</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeCategory === category.id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Popular Questions</h3>
                <ul className="space-y-4">
                  {filteredFaqs.popular && filteredFaqs.popular.map((faq: FaqItem, index: number) => (
                    <li key={`popular-${index}`} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <Link 
                        href={`#${faq.category ?? 'popular'}-${index}`}
                        className="block hover:text-primary transition-colors cursor-pointer"
                        onClick={() => {
                          setActiveCategory(faq.category ?? 'popular');
                          setTimeout(() => {
                            toggleFaq(faq.category ?? 'popular', index);
                            document.getElementById(`${faq.category ?? 'popular'}-${index}`)?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                      >
                        <p className="text-sm text-gray-600">{faq.question}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact Info */}
              <div className="bg-white rounded-xl p-6 shadow-sm mt-6">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Need More Help?</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Our support team is available to answer any questions you might have.
                </p>
                <div className="space-y-3">
                  <Link href="mailto:lockedeventsgh@gmail.com" className="flex items-center text-primary hover:underline">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>lockedeventsgh@gmail.com</span>
                  </Link>
                  <Link href="tel:+233302123456" className="flex items-center text-primary hover:underline">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>+233 12 345 6789</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Render FAQs by category */}
              {Object.keys(faqData).map((categoryId) => {
                // Skip "popular" category as it's in the sidebar
                if (categoryId === 'popular') return null;
                
                // Skip this category if filtering by another category
                if (activeCategory !== 'all' && activeCategory !== categoryId) return null;

                const categoryFaqs = filteredFaqs[categoryId as keyof FaqsByCategory];
                if (!categoryFaqs || categoryFaqs.length === 0) return null;

                return (
                  <div key={categoryId} className="mb-10 last:mb-0" id={categoryId}>
                    <h2 className="text-2xl font-bold mb-6 flex items-center">
                      {/* Category Icon (you can customize based on category) */}
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary mr-3">
                        <CategoryIcon categoryId={categoryId} />
                      </span>
                      
                      {/* Category Title */}
                      {categoryId.charAt(0).toUpperCase() + categoryId.slice(1)}
                    </h2>

                    <div className="space-y-4">
                      {categoryFaqs.map((faq: FaqItem, index: number) => {
                        const faqKey = `${categoryId}-${index}`;
                        const isOpen = openFaqs[faqKey];

                        return (
                          <div 
                            key={faqKey} 
                            id={faqKey} 
                            className={`bg-white rounded-xl overflow-hidden shadow-sm transition-shadow ${isOpen ? 'shadow-md' : ''}`}
                          >
                            <button
                              onClick={() => toggleFaq(categoryId, index)}
                              className="w-full text-left px-6 py-4 flex justify-between items-center"
                            >
                              <h3 className="font-medium text-lg">{faq.question}</h3>
                              {isOpen ? (
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            
                            <div
                              className={`px-6 overflow-hidden transition-all duration-300 ${
                                isOpen ? 'max-h-96 pb-6' : 'max-h-0'
                              }`}
                            >
                              <p className="text-gray-600">{faq.answer}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Still Have Questions CTA */}
      <section className="bg-gradient-to-r from-primary/5 to-primary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl shadow-lg max-w-3xl mx-auto p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <HelpCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto">
              Can't find the answer you're looking for? Our expert customer support team is available to help you with any questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/contact" className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors">
                Contact Support
              </Link>
              <Link href="mailto:lockedeventsgh@gmail.com" className="px-6 py-3 bg-white border border-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Email Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper component to render category icons
function CategoryIcon({ categoryId }: { categoryId: string }) {
  switch (categoryId) {
    case 'booking':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      );
    case 'payments':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
        </svg>
      );
    case 'events':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      );
    case 'account':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      );
    case 'security':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'voting':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      );
  }
}
