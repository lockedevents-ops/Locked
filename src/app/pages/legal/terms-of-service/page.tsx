"use client";

import { Shield, FileText, Users, CreditCard, AlertTriangle, Scale, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-16 pt-32 md:pt-36">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-lg text-white/90">
            Last Updated: November 10, 2025
          </p>
          <p className="text-sm text-white/80 mt-2">
            Governed by the Laws of the Republic of Ghana
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          
          {/* 1. Agreement to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              1. Agreement to Terms
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                By accessing or using Locked ("Platform", "Service", "we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms") and all applicable laws and regulations of Ghana. If you disagree with any part of these terms, you may not access the Service.
              </p>
              <p>
                Locked is an event discovery, ticketing, voting, and venue booking platform operating in Ghana under the Companies Act, 2019 (Act 992). We connect event organizers, venue owners, and attendees to create memorable experiences while complying with the <strong>Electronic Transactions Act, 2008 (Act 772)</strong>, the <strong>Data Protection Act, 2012 (Act 843)</strong>, and other relevant Ghanaian legislation.
              </p>
              <p>
                This agreement is governed by the Constitution of Ghana, 1992, and disputes shall be resolved in accordance with Ghanaian law and the jurisdiction of Ghanaian courts.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> These Terms constitute a legally binding agreement under Ghanaian contract law. By using our Service, you acknowledge that electronic agreements have the same legal force as written contracts under the Electronic Transactions Act, 2008 (Act 772).
                </p>
              </div>
            </div>
          </section>

          {/* 2. User Accounts */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              2. User Accounts
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-2">2.1 Account Creation</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You must be at least 13 years old to create an account</li>
                  <li>You must provide accurate, current, and complete information</li>
                  <li>You are responsible for maintaining the security of your account</li>
                  <li>You are responsible for all activities that occur under your account</li>
                  <li>You must notify us immediately of any unauthorized use</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">2.2 Account Types</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>General Users:</strong> Can discover events, purchase tickets, vote, and lock events</li>
                  <li><strong>Event Organizers:</strong> Can create, publish, and manage events</li>
                  <li><strong>Venue Owners:</strong> Can list and manage venues for bookings</li>
                  <li><strong>Administrators:</strong> Platform management and oversight</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">2.3 Account Termination</h3>
                <p>We reserve the right to suspend or terminate accounts that:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Violate these Terms of Service</li>
                  <li>Engage in fraudulent activities</li>
                  <li>Misuse the platform or harm other users</li>
                  <li>Remain inactive for extended periods (over 2 years)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Event Organizer Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              3. Event Organizer Responsibilities
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-2">3.1 Event Creation</h3>
                <p>As an event organizer, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Provide accurate and truthful event information</li>
                  <li>Upload appropriate event images (no copyrighted content without permission)</li>
                  <li>Set fair and transparent ticket prices</li>
                  <li>Honor all ticket sales and commitments</li>
                  <li>Comply with all local laws and regulations in Ghana</li>
                  <li>Obtain necessary permits and licenses for your events</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3.2 Event Management</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Keep event information up-to-date</li>
                  <li>Respond to attendee inquiries promptly</li>
                  <li>Provide clear refund policies</li>
                  <li>Use QR code ticket validation at event entry</li>
                  <li>Report any issues or incidents immediately</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3.3 Prohibited Event Content</h3>
                <p>You may not create events that:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Promote illegal activities or violence</li>
                  <li>Contain hate speech or discriminatory content</li>
                  <li>Violate intellectual property rights</li>
                  <li>Involve adult content without proper age restrictions</li>
                  <li>Mislead or defraud attendees</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. Venue Owner Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Venue Owner Responsibilities
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-2">4.1 Venue Listings</h3>
                <p>As a venue owner, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Provide accurate venue information (capacity, amenities, location)</li>
                  <li>Upload high-quality, truthful venue photos</li>
                  <li>Set fair pricing and availability</li>
                  <li>Honor all confirmed bookings</li>
                  <li>Maintain venue safety and compliance standards</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">4.2 Booking Management</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Respond to booking requests within 48 hours</li>
                  <li>Provide clear cancellation policies</li>
                  <li>Communicate any venue changes or issues promptly</li>
                  <li>Ensure venue is ready for booked events</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Ticket Purchases and Refunds */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              5. Ticket Purchases and Refunds
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-2">5.1 Ticket Sales</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All ticket sales are processed through Hubtel payment gateway</li>
                  <li>Tickets are delivered electronically with QR codes</li>
                  <li>You must present valid QR code tickets for event entry</li>
                  <li>Tickets are non-transferable unless stated otherwise by the organizer</li>
                  <li>Prices are displayed in Ghanaian Cedis (GHS)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">5.2 Refund Policy</h3>
                <p>Refund eligibility depends on:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Event Cancellation:</strong> Full refund if event is cancelled by organizer</li>
                  <li><strong>Event Postponement:</strong> Tickets remain valid for rescheduled date, or refund available</li>
                  <li><strong>Organizer Policy:</strong> Individual organizers set their own refund policies</li>
                  <li><strong>Processing Time:</strong> Refunds processed within 7-14 business days</li>
                  <li><strong>Platform Fees:</strong> Service fees are non-refundable</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">5.3 Ticket Disputes</h3>
                <p>If you have issues with a ticket purchase, contact us at <a href="mailto:lockedeventsgh@gmail.com" className="text-black font-medium hover:underline">lockedeventsgh@gmail.com</a> within 48 hours of the event.</p>
              </div>
            </div>
          </section>

          {/* 6. Payment Processing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. Payment Processing and Payouts
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                All financial transactions on Locked are governed by the National Payment Systems Act, 2003 (Act 662), the Electronic Transactions Act, 2008 (Act 772), and regulations of the Bank of Ghana and the National Communications Authority.
              </p>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">6.1 Payment Processing</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All payments are processed securely through Hubtel, a licensed payment service provider regulated by the Bank of Ghana</li>
                  <li>We accept Mobile Money, bank cards, and other Hubtel-supported methods in compliance with the National Payment Systems Act</li>
                  <li>Platform service fees are deducted from each transaction and reported to the Ghana Revenue Authority as required by the Income Tax Act, 2015 (Act 896)</li>
                  <li>Payment information is encrypted and secure in accordance with the Electronic Transactions Act, 2008 (Act 772) and the Cybersecurity Act, 2020 (Act 1038)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">6.2 Organizer Payouts</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Payouts are processed after events conclude in accordance with the Companies Act, 2019 (Act 992)</li>
                  <li>Minimum payout threshold: 50 GHS</li>
                  <li>Payout processing time: 3-7 business days (subject to Bank of Ghana regulations)</li>
                  <li>Valid bank account or Mobile Money number required (verified per Anti-Money Laundering Act, 2020 [Act 1044])</li>
                  <li>Platform commission ranges from 5-15% depending on tier</li>
                  <li>All transactions are subject to applicable VAT under the VAT Act, 2013 (Act 870)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">6.3 Pricing Tiers</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Free Tier:</strong> 15% platform commission</li>
                  <li><strong>Platinum Tier:</strong> 10% commission + premium features</li>
                  <li><strong>Elite Tier:</strong> 5% commission + all premium features</li>
                </ul>
                <p className="mt-2 text-sm">All pricing is in Ghana Cedis (GHS) and subject to applicable taxes as required by Ghanaian law.</p>
              </div>
            </div>
          </section>

          {/* 7. Voting System */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. Voting System
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-2">7.1 Voting Rules</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Only authenticated users can vote</li>
                  <li>Each user gets one vote per contest/category</li>
                  <li>Voting periods are set by event organizers</li>
                  <li>Vote manipulation or fraud is strictly prohibited</li>
                  <li>Votes are final and cannot be changed after submission</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">7.2 Fair Voting</h3>
                <p>We employ measures to ensure fair voting:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>IP address monitoring for duplicate voting detection</li>
                  <li>Account verification requirements</li>
                  <li>Automated fraud detection systems</li>
                  <li>Manual review for suspicious activity</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">7.3 Voting Violations</h3>
                <p>The following activities may result in account suspension:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Creating multiple accounts to vote</li>
                  <li>Using bots or automated voting systems</li>
                  <li>Buying or selling votes</li>
                  <li>Coordinating vote manipulation schemes</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              8. Intellectual Property Rights
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Intellectual property rights on Locked are protected under the Copyright Act, 2005 (Act 690) of Ghana and other applicable intellectual property laws.
              </p>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">8.1 Platform Content</h3>
                <p>
                  The Locked platform, including its design, features, code, and branding, is owned by Locked and protected by the Copyright Act, 2005 (Act 690) and other intellectual property laws of Ghana. You may not copy, modify, or distribute our platform without written permission.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">8.2 User Content</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You retain ownership of content you upload (event descriptions, images, etc.) under the Copyright Act, 2005 (Act 690)</li>
                  <li>You grant Locked a non-exclusive, worldwide license to display, reproduce, and promote your content for platform operations</li>
                  <li>You warrant that you have all necessary rights to upload content and that it does not violate any Ghanaian laws</li>
                  <li>You are responsible for ensuring content doesn't infringe on third-party rights protected under Ghanaian intellectual property laws</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">8.3 Copyright Infringement</h3>
                <p>
                  If you believe content on our platform infringes your copyright under the Copyright Act, 2005 (Act 690), contact us at <a href="mailto:lockedeventsgh@gmail.com" className="text-black font-medium hover:underline">lockedeventsgh@gmail.com</a> with:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Description of the copyrighted work protected under Ghanaian law</li>
                  <li>Location of the infringing content on our platform</li>
                  <li>Your contact information (Ghana-based preferred)</li>
                  <li>Statement of good faith belief that use is not authorized</li>
                  <li>Electronic or physical signature</li>
                  <li>Evidence of copyright ownership (if available)</li>
                </ul>
                <p className="mt-2 text-sm">
                  Copyright disputes will be handled in accordance with the Copyright Act, 2005 (Act 690) and may be referred to the Copyright Office of Ghana if necessary.
                </p>
              </div>
            </div>
          </section>

          {/* 9. Privacy and Data Protection */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              9. Privacy and Data Protection
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Your privacy is protected under the Data Protection Act, 2012 (Act 843) of Ghana. Locked is registered as a data controller with the Data Protection Commission of Ghana and complies fully with Ghanaian data protection laws.
              </p>
              <p>
                Our collection, use, and protection of your personal data is governed by our <Link href="/pages/legal/privacy-policy" className="text-black font-medium hover:underline">Privacy Policy</Link>, which complies with Act 843 and the Electronic Transactions Act, 2008 (Act 772).
              </p>
              <p>By using Locked, you provide informed consent under Section 11 of the Data Protection Act, 2012 (Act 843) to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Collection and processing of personal information as described in our Privacy Policy</li>
                <li>Processing of payment information through Hubtel in compliance with the National Payment Systems Act</li>
                <li>Use of cookies and tracking technologies as permitted under Act 843</li>
                <li>Storage of data on secure infrastructure with appropriate safeguards per Section 19 of Act 843</li>
                <li>Cross-border data transfers where necessary, in compliance with Section 40 of Act 843</li>
              </ul>
              <p className="mt-3">
                You have rights under the Data Protection Act, 2012 (Act 843) to access, correct, and request deletion of your personal data. See our Privacy Policy for full details or contact our Data Protection Officer at <a href="mailto:dpo@locked.com" className="text-black font-medium hover:underline">dpo@locked.com</a>.
              </p>
            </div>
          </section>

          {/* 10. Prohibited Activities */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              10. Prohibited Activities
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                The following activities are prohibited and may constitute violations of Ghanaian criminal and civil law, including but not limited to the Criminal Offences Act, 1960 (Act 29), the Cybersecurity Act, 2020 (Act 1038), the Data Protection Act, 2012 (Act 843), and the Electronic Transactions Act, 2008 (Act 772).
              </p>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any laws or regulations of Ghana, including the Criminal Offences Act, 1960 (Act 29), the Constitution of Ghana, 1992, or other applicable legislation</li>
                <li>Impersonate others or provide false information (fraud under the Criminal Offences Act)</li>
                <li>Harass, abuse, threaten, or harm other users (criminal offenses under Ghanaian law)</li>
                <li>Distribute malware, viruses, or engage in hacking activities (violations of the Cybersecurity Act, 2020 [Act 1038])</li>
                <li>Scrape or extract data from the platform without permission (violation of Data Protection Act, 2012 [Act 843])</li>
                <li>Interfere with platform operations, security measures, or server infrastructure</li>
                <li>Create fake accounts or engage in fraudulent activities (fraud under Ghanaian criminal law)</li>
                <li>Spam or send unsolicited commercial messages without consent</li>
                <li>Manipulate engagement metrics (fake locks, views, votes, etc.) - constitutes fraud</li>
                <li>Resell tickets at unauthorized markups (scalping)</li>
                <li>Engage in money laundering or terrorist financing (violations of Anti-Money Laundering Act, 2020 [Act 1044])</li>
                <li>Use the platform for any illegal purpose under Ghanaian law</li>
              </ul>
              <p className="mt-3 font-semibold">
                Violations may result in account suspension, termination, civil liability, and/or criminal prosecution under Ghanaian law. We cooperate fully with the Ghana Police Service, EOCO, and other law enforcement agencies as required by law.
              </p>
            </div>
          </section>

          {/* 11. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5" />
              11. Limitation of Liability
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                This section is subject to Ghanaian contract law and the Constitution of Ghana, 1992. Nothing in these Terms shall limit our liability for fraud, gross negligence, or violations of your fundamental rights under the Constitution.
              </p>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">11.1 Platform Provided "As Is"</h3>
                <p>
                  Subject to applicable Ghanaian law, Locked is provided "as is" without warranties of any kind. We do not guarantee uninterrupted, error-free, or secure service, though we implement security measures as required by the Cybersecurity Act, 2020 (Act 1038) and the Electronic Transactions Act, 2008 (Act 772).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">11.2 No Liability for Events</h3>
                <p>
                  Locked is a platform connecting organizers and attendees. Under Ghanaian law, we act as an intermediary and are not responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Event quality, safety, or execution (organizer responsibility)</li>
                  <li>Organizer conduct or performance</li>
                  <li>Venue suitability or conditions (venue owner responsibility)</li>
                  <li>Disputes between users (subject to Ghanaian dispute resolution mechanisms)</li>
                  <li>Loss, injury, or damage at events</li>
                </ul>
                <p className="mt-2">
                  Event organizers and venue owners bear primary legal responsibility under the Companies Act, 2019 (Act 992) and other applicable Ghanaian laws for their respective operations.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">11.3 Maximum Liability</h3>
                <p>
                  To the extent permitted by Ghanaian law, our total liability to you for any claims arising from or related to these Terms or your use of the platform shall not exceed the amount you paid to Locked in the 12 months preceding the claim, or 100 GHS, whichever is greater.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-red-800">
                  <strong>Important:</strong> Under Ghanaian law and the Constitution of Ghana, 1992, certain rights cannot be waived. These liability limitations do not affect your statutory rights or remedies available under Ghanaian law, including rights to seek redress in Ghanaian courts for breaches of fundamental rights or gross negligence.
                </p>
              </div>
            </div>
          </section>

          {/* 12. Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              12. Indemnification
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Under Ghanaian tort law and contract law principles, you agree to indemnify, defend, and hold harmless Locked, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable legal fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your use of the platform in violation of these Terms or Ghanaian law</li>
                <li>Your violation of these Terms or any applicable Ghanaian legislation</li>
                <li>Your violation of any rights of third parties, including intellectual property rights under the Copyright Act, 2005 (Act 690)</li>
                <li>Events you organize or venues you list (including liability under the Companies Act, 2019 [Act 992])</li>
                <li>Content you upload to the platform that violates Ghanaian law or third-party rights</li>
                <li>Your breach of the Data Protection Act, 2012 (Act 843) if you process personal data through the platform</li>
                <li>Any criminal or civil liability you incur under Ghanaian law while using the platform</li>
              </ul>
              <p className="mt-3">
                This indemnification obligation extends to claims brought in Ghanaian courts or through Ghanaian dispute resolution mechanisms, and includes cooperation with investigations by Ghanaian law enforcement authorities.
              </p>
            </div>
          </section>

          {/* 13. Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              13. Dispute Resolution
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Disputes arising from these Terms or your use of Locked shall be resolved in accordance with the Alternative Dispute Resolution Act, 2010 (Act 798), the Arbitration Act, 2010 (Act 798), and the Courts Act, 1993 (Act 459) of Ghana.
              </p>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">13.1 Informal Resolution</h3>
                <p>
                  Before initiating any formal legal proceedings, please contact us at <a href="mailto:lockedeventsgh@gmail.com" className="text-black font-medium hover:underline">lockedeventsgh@gmail.com</a> to attempt informal resolution. We are committed to resolving disputes amicably within 30 days of receiving your complaint.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">13.2 Mediation</h3>
                <p>
                  If informal resolution fails, both parties agree to participate in mediation under the Alternative Dispute Resolution Act, 2010 (Act 798) before pursuing litigation. Mediation shall be conducted:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>In Accra, Ghana</li>
                  <li>Through a mutually agreed mediator or the Ghana ADR Hub</li>
                  <li>In accordance with Ghanaian ADR principles</li>
                  <li>With costs shared equally unless otherwise agreed</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">13.3 Arbitration</h3>
                <p>
                  For disputes exceeding 5,000 GHS where mediation is unsuccessful, both parties agree to binding arbitration under the Arbitration Act, 2010 (Act 798):
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Venue: Accra, Ghana</li>
                  <li>Administered by: Ghana Arbitration Centre</li>
                  <li>Language: English</li>
                  <li>Number of arbitrators: One (1) or three (3) as parties agree</li>
                  <li>Arbitration awards shall be final and binding under Ghanaian law</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">13.4 Governing Law and Jurisdiction</h3>
                <p>
                  These Terms are governed by and construed in accordance with the laws of the Republic of Ghana, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>The Constitution of Ghana, 1992</li>
                  <li>The Electronic Transactions Act, 2008 (Act 772)</li>
                  <li>The Data Protection Act, 2012 (Act 843)</li>
                  <li>Ghanaian contract and tort law principles</li>
                  <li>Other applicable Ghanaian legislation</li>
                </ul>
                <p className="mt-2">
                  Any disputes not resolved through mediation or arbitration shall be subject to the exclusive jurisdiction of the courts of Ghana, particularly the High Court in Accra, under the Courts Act, 1993 (Act 459).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">13.5 Small Claims</h3>
                <p>
                  For disputes under 5,000 GHS, either party may pursue resolution through appropriate Ghanaian small claims procedures or the District Court system without mandatory mediation or arbitration.
                </p>
              </div>
            </div>
          </section>

          {/* 14. Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              14. Changes to These Terms
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                We reserve the right to modify these Terms at any time in accordance with Ghanaian contract law and the Electronic Transactions Act, 2008 (Act 772). Material changes will be communicated to you by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Posting updated Terms on this page with a revised "Last Updated" date</li>
                <li>Sending an email notification to your registered email address</li>
                <li>Displaying a prominent notification on the platform</li>
                <li>Providing at least 30 days' notice for significant changes affecting your rights</li>
              </ul>
              <p className="mt-3">
                Under the Electronic Transactions Act, 2008 (Act 772), your continued use of Locked after such notification constitutes your acceptance of the updated Terms. If you do not agree to the changes, you must discontinue use of the platform and may terminate your account as per Section 15.
              </p>
              <p className="mt-2">
                For changes required by Ghanaian law or regulation (such as amendments to the Data Protection Act or other applicable legislation), we will implement such changes immediately with appropriate notice.
              </p>
            </div>
          </section>

          {/* 15. Termination */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              15. Termination
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Account termination is governed by Ghanaian contract law, the Data Protection Act, 2012 (Act 843), and the Companies Act, 2019 (Act 992).
              </p>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">15.1 Your Rights to Terminate</h3>
                <p>
                  You may terminate your account at any time through your account settings or by contacting <a href="mailto:lockedeventsgh@gmail.com" className="text-black font-medium hover:underline">lockedeventsgh@gmail.com</a>. Upon termination:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Active event listings will be removed immediately</li>
                  <li>Pending payouts will be processed within 7-14 business days (subject to Bank of Ghana regulations)</li>
                  <li>Personal data will be handled in accordance with our Privacy Policy and the Data Protection Act, 2012 (Act 843), including your right to erasure under Section 32</li>
                  <li>Outstanding contractual obligations (refunds, pending transactions) remain in effect under Ghanaian law</li>
                  <li>Data required for legal compliance (tax records, etc.) will be retained as required by the Income Tax Act, 2015 (Act 896) and other applicable laws</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">15.2 Our Rights to Terminate</h3>
                <p>
                  We may suspend or terminate your account immediately, with or without notice, if you:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Violate these Terms or any applicable Ghanaian laws</li>
                  <li>Engage in fraudulent activities (criminal offense under Ghanaian law)</li>
                  <li>Harm the platform, its security, or other users</li>
                  <li>Fail to pay required fees or platform commissions</li>
                  <li>Violate the Cybersecurity Act, 2020 (Act 1038) or Data Protection Act, 2012 (Act 843)</li>
                  <li>Are subject to investigation by Ghanaian law enforcement (Ghana Police, EOCO, etc.)</li>
                </ul>
                <p className="mt-2">
                  Upon termination by us, you will be notified via email with reasons for the action. You have the right to appeal the decision by contacting <a href="mailto:appeals@locked.com" className="text-black font-medium hover:underline">appeals@locked.com</a> within 14 days.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">15.3 Effect of Termination</h3>
                <p>
                  Upon termination by either party:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Your access to the platform will cease</li>
                  <li>Sections 8 (Intellectual Property), 11 (Liability), 12 (Indemnification), and 13 (Dispute Resolution) shall survive termination</li>
                  <li>We will comply with data retention and deletion obligations under the Data Protection Act, 2012 (Act 843)</li>
                  <li>Financial records will be retained for 6 years as required by the Income Tax Act, 2015 (Act 896)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 16. Miscellaneous */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              16. Miscellaneous
            </h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-2">16.1 Entire Agreement</h3>
                <p>
                  These Terms, along with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and Locked under Ghanaian contract law. This agreement supersedes all prior understandings and agreements, whether written or oral.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">16.2 Severability</h3>
                <p>
                  If any provision of these Terms is found to be invalid, illegal, or unenforceable by a Ghanaian court under the Courts Act, 1993 (Act 459) or the Constitution of Ghana, 1992, the remaining provisions will continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable under Ghanaian law.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">16.3 No Waiver</h3>
                <p>
                  Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision under Ghanaian law. Any waiver must be in writing and signed by an authorized representative of Locked.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">16.4 Assignment</h3>
                <p>
                  You may not transfer, assign, or delegate these Terms or your account to any third party without our prior written consent. We may assign our rights and obligations under these Terms without restriction, including in connection with a merger, acquisition, or sale of assets, subject to compliance with the Companies Act, 2019 (Act 992) and the Data Protection Act, 2012 (Act 843).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">16.5 Language</h3>
                <p>
                  These Terms are drafted in English. In the event of any translation into other languages, the English version shall prevail in interpretation and enforcement under Ghanaian law.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">16.6 Force Majeure</h3>
                <p>
                  Neither party shall be liable for failure to perform obligations due to circumstances beyond reasonable control, including but not limited to acts of God, war, terrorism, civil unrest, government actions, natural disasters, or telecommunications failures, as recognized under Ghanaian contract law principles.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Email
                </h3>
                <a href="mailto:legal@locked.com" className="text-black hover:underline">
                  legal@locked.com
                </a>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Support
                </h3>
                <a href="mailto:lockedeventsgh@gmail.com" className="text-black hover:underline">
                  lockedeventsgh@gmail.com
                </a>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
                <p className="text-gray-700">+233 XX XXX XXXX</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                <p className="text-gray-700">
                  Accra, Ghana
                </p>
              </div>
            </div>
          </section>

          {/* Related Documents */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Legal Documents</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link 
                href="/pages/legal/privacy-policy"
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-black transition-colors group"
              >
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-black flex items-center gap-2">
                  Privacy Policy
                  <ExternalLink className="w-4 h-4" />
                </h3>
                <p className="text-sm text-gray-600">Learn how we collect, use, and protect your data</p>
              </Link>

              <Link 
                href="/pages/legal/cookie-policy"
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-black transition-colors group"
              >
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-black flex items-center gap-2">
                  Cookie Policy
                  <ExternalLink className="w-4 h-4" />
                </h3>
                <p className="text-sm text-gray-600">Understand how we use cookies and tracking</p>
              </Link>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
