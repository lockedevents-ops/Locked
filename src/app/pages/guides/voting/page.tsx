"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Phone, CreditCard, HelpCircle, Clock, Award, AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function VotingGuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-primary text-white">
        <div className="absolute inset-0 bg-[url('/images/voting-pattern.png')] opacity-10 mix-blend-overlay" />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 mt-24">Voting Guide</h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Support your favorite contestants and help them win by voting through our secure and transparent platform.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">What is Event Voting?</h2>
            <div className="prose prose-lg max-w-none text-neutral-700">
              <p>
                Locked's voting feature allows you to support your favorite contestants in various events such as pageants,
                talent shows, reality competitions, and more. Your votes directly influence the outcome of these events,
                giving power to fans and attendees to determine winners.
              </p>
              <p>
                Our secure voting system ensures transparency and fairness while making it easy and fun to participate
                in events across Ghana.
              </p>
            </div>
            
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              <div className="bg-neutral-50 p-6 rounded-xl">
                <Award className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Support Contestants</h3>
                <p className="text-neutral-600">
                  Help your favorite contestants win by casting votes that count toward their total score.
                </p>
              </div>
              
              <div className="bg-neutral-50 p-6 rounded-xl">
                <Clock className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Real-time Results</h3>
                <p className="text-neutral-600">
                  Watch results update in real-time during voting phases of supported events.
                </p>
              </div>
              
              <div className="bg-neutral-50 p-6 rounded-xl">
                <CheckCircle className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Secure & Transparent</h3>
                <p className="text-neutral-600">
                  Our voting system is designed with security and transparency as top priorities.
                </p>
              </div>
            </div>
          </section>

          {/* How Voting Works */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">How Voting Works</h2>
            
            <div className="relative border-l-4 border-primary/20 pl-8 space-y-12 ml-4">
              {/* Step 1 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">1</div>
                <h3 className="text-2xl font-semibold mb-3">Find an event with voting</h3>
                <p className="text-neutral-600 mb-4">
                  Look for events with the voting badge in the event listing. These events allow audience participation through voting.
                </p>
                <div className="bg-neutral-50 p-4 rounded-lg mt-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" />
                      </svg>
                      <span>Voting</span>
                    </div>
                    <span>← Look for this badge on event cards</span>
                  </div>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">2</div>
                <h3 className="text-2xl font-semibold mb-3">Select a contestant</h3>
                <p className="text-neutral-600 mb-4">
                  On the event page, browse through the list of contestants and select the one you want to support.
                </p>
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <Image 
                    src="/images/voting-contestants.jpg" 
                    width={700} 
                    height={350}
                    alt="Screenshot of contestants selection"
                    className="w-full object-cover"
                  />
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">3</div>
                <h3 className="text-2xl font-semibold mb-3">Choose number of votes</h3>
                <p className="text-neutral-600 mb-4">
                  Decide how many votes you want to cast for your chosen contestant. Each vote has a small cost that 
                  supports the event and platform.
                </p>
                <div className="bg-neutral-50 p-5 rounded-lg flex items-center gap-6">
                  <div className="flex items-center">
                    <div className="bg-neutral-200 text-neutral-700 rounded-full flex items-center justify-center w-10 h-10">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                      </svg>
                    </div>
                    
                    <div className="mx-4 text-center">
                      <div className="text-3xl font-bold text-primary">5</div>
                      <div className="text-xs text-neutral-500">Votes</div>
                    </div>
                    
                    <div className="bg-primary text-white rounded-full flex items-center justify-center w-10 h-10">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-600">Cost per vote</span>
                      <span className="font-medium">₵1.00</span>
                    </div>
                    
                    <div className="flex items-center justify-between font-medium mt-1">
                      <span>Total</span>
                      <span className="text-lg text-primary">₵5.00</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Step 4 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">4</div>
                <h3 className="text-2xl font-semibold mb-3">Choose payment method</h3>
                <p className="text-neutral-600 mb-4">
                  Pay for your votes using Mobile Money or Credit/Debit Card. Our payment process is secure and takes just a few seconds.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="border border-neutral-200 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Phone className="text-primary w-5 h-5" />
                      <h4 className="font-semibold">Mobile Money</h4>
                    </div>
                    <p className="text-sm text-neutral-600">
                      Enter your Mobile Money number and confirm the payment on your phone when prompted.
                    </p>
                  </div>
                  <div className="border border-neutral-200 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <CreditCard className="text-primary w-5 h-5" />
                      <h4 className="font-semibold">Credit/Debit Card</h4>
                    </div>
                    <p className="text-sm text-neutral-600">
                      Enter your card details to complete your payment securely through our payment partner.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Step 5 */}
              <div className="relative">
                <div className="absolute -left-12 top-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">5</div>
                <h3 className="text-2xl font-semibold mb-3">Confirmation</h3>
                <p className="text-neutral-600 mb-4">
                  After your payment is processed, you'll receive a confirmation that your votes have been counted.
                  The contestant's vote count will be updated in real-time.
                </p>
                <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="text-green-500 w-5 h-5" />
                  <span className="text-green-800">Your votes have been successfully counted!</span>
                </div>
              </div>
            </div>
          </section>

          {/* Types of Voting Events */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Types of Events with Voting</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3">Pageants</h3>
                <p className="text-neutral-600 mb-4">
                  Beauty contests like Miss Ghana, Miss University, and regional pageants that allow audience voting
                  for contestants.
                </p>
                <Image 
                  src="/images/pageant-example.jpg" 
                  width={400} 
                  height={200}
                  alt="Pageant event"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3">Talent Shows</h3>
                <p className="text-neutral-600 mb-4">
                  Music competitions, dance contests, and variety shows where audience votes help determine winners.
                </p>
                <Image 
                  src="/images/talent-show-example.jpg" 
                  width={400} 
                  height={200}
                  alt="Talent show event"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3">Reality Competitions</h3>
                <p className="text-neutral-600 mb-4">
                  Long-running reality shows with weekly eliminations where viewers can vote for their favorites.
                </p>
                <Image 
                  src="/images/reality-competition-example.jpg" 
                  width={400} 
                  height={200}
                  alt="Reality competition event"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-xl font-semibold mb-3">Awards & Recognitions</h3>
                <p className="text-neutral-600 mb-4">
                  Public choice categories in award ceremonies where audience votes determine winners.
                </p>
                <Image 
                  src="/images/awards-example.jpg" 
                  width={400} 
                  height={200}
                  alt="Awards event"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            </div>
          </section>

          {/* Fair Voting Policy */}
          <section className="mb-16 bg-neutral-50 p-8 rounded-xl border border-neutral-100">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <AlertTriangle className="text-amber-500 w-7 h-7" />
              <span>Fair Voting Policy</span>
            </h2>
            <div className="prose max-w-none text-neutral-700">
              <p>
                At Locked, we are committed to maintaining the integrity of all voting events on our platform.
                Our fair voting policy ensures that:
              </p>
              <ul>
                <li>Each vote is counted accurately and transparently</li>
                <li>All contestants have equal opportunity for promotion on the platform</li>
                <li>Voting results cannot be manipulated by automated systems or bulk voting</li>
                <li>Event organizers receive detailed analytics and audit trails</li>
                <li>All voting data is secured and protected from unauthorized access</li>
              </ul>
              <p>
                We continuously monitor voting patterns and have systems in place to detect and prevent fraudulent activities.
                Violations of our fair voting policy may result in votes being nullified and accounts being suspended.
              </p>
            </div>
            <Link 
              href="/voting-policy" 
              className="inline-flex items-center gap-2 text-primary font-medium mt-4 hover:text-primary-dark"
            >
              Read the full Voting Policy
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </section>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              {[
                {
                  question: "How much does it cost to vote?",
                  answer: "Voting costs typically start at ₵1 per vote, but this may vary depending on the specific event. The exact price will always be clearly displayed before you confirm your payment."
                },
                {
                  question: "Is there a limit to how many votes I can cast?",
                  answer: "Most events don't have a strict limit on the number of votes you can cast. However, to ensure fair competition, we may implement voting caps for certain high-profile events. Any voting limits will be clearly communicated on the event page."
                },
                {
                  question: "Can I vote if I'm outside Ghana?",
                  answer: "Yes! You can vote from anywhere in the world as long as you have a supported payment method (international credit/debit card or a Mobile Money account)."
                },
                {
                  question: "Are my payment details secure?",
                  answer: "Absolutely. We use industry-standard encryption and security practices to protect your payment information. We never store your full credit card details or Mobile Money PIN on our servers."
                },
                {
                  question: "Can I get a refund for votes?",
                  answer: "Due to the nature of voting, votes cannot be refunded once they have been cast and counted. Please make sure you're voting for your intended contestant before confirming."
                },
                {
                  question: "How do I know my votes were counted?",
                  answer: "After your payment is successfully processed, you'll receive an on-screen confirmation, followed by an email receipt. The contestant's vote count will also update in real-time on the event page."
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
              If you have additional questions about voting or encountered any issues during the voting process,
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