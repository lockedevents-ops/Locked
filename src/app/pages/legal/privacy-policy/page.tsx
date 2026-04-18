"use client";

import Link from 'next/link';
import { Shield, Mail, Phone, MapPin } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-16 pt-32 md:pt-36">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-lg text-white/90">
            Last Updated: November 10, 2025
          </p>
          <p className="text-sm text-white/80 mt-2">
            This Privacy Policy complies with the Data Protection Act, 2012 (Act 843) of Ghana
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-lg max-w-none">
          
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Welcome to Locked ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy in accordance with the <strong>Data Protection Act, 2012 (Act 843)</strong> of Ghana and the <strong>Electronic Transactions Act, 2008 (Act 772)</strong>.
            </p>
            <p className="text-gray-700 mb-4">
              Locked is an event discovery, ticketing, voting, and venue booking platform operating in Ghana. We facilitate connections between event organizers, venue owners, and attendees while providing comprehensive event management and ticketing services. As a data controller under the Data Protection Act, we are registered with the Data Protection Commission of Ghana.
            </p>
            <p className="text-gray-700 mb-4">
              By accessing or using our Platform at locked.com (the "Platform"), you consent to the collection and use of your personal data in accordance with this Privacy Policy and applicable Ghanaian data protection laws.
            </p>
            <p className="text-gray-700">
              If you do not agree with our policies and practices, please do not use our Platform. Your continued use of the Platform constitutes acceptance of any updates to this Privacy Policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Information You Provide to Us</h3>
            <p className="text-gray-700 mb-4">
              We collect information that you voluntarily provide when using our Platform:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Account Information:</strong> Name, email address, phone number, password, date of birth, profile photo, and account preferences</li>
              <li><strong>Profile Information:</strong> Bio, social media links, website, organization name, and professional details for organizers and venue owners</li>
              <li><strong>Event Information:</strong> Event titles, descriptions, dates, times, locations, categories, images, videos, pricing, and ticketing details</li>
              <li><strong>Venue Information:</strong> Venue name, address, capacity, amenities, photos, pricing, availability, and booking details</li>
              <li><strong>Payment Information:</strong> Mobile money details, bank account information (for organizers receiving payouts), and transaction history</li>
              <li><strong>Communication Data:</strong> Messages sent through our platform, customer support inquiries, feedback, and reviews</li>
              <li><strong>Verification Documents:</strong> Government-issued IDs, business registration documents for role verification</li>
              <li><strong>User-Generated Content:</strong> Event comments, ratings, reviews, photos uploaded to events or venues</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Information Collected Automatically</h3>
            <p className="text-gray-700 mb-4">
              When you access our Platform, we automatically collect certain information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers, and mobile network information</li>
              <li><strong>Usage Data:</strong> Pages viewed, time spent on pages, click data, search queries, events browsed, events locked/saved</li>
              <li><strong>Location Data:</strong> General geographic location based on IP address; precise location if you grant permission</li>
              <li><strong>Cookies and Tracking:</strong> Session cookies, preference cookies, analytics cookies, and local storage data</li>
              <li><strong>Log Data:</strong> Server logs including access times, pages viewed, and error logs</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Information from Third Parties</h3>
            <p className="text-gray-700 mb-4">
              We may receive information from third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Social Media:</strong> Profile information when you sign in using Google, Facebook, or other social authentication</li>
              <li><strong>Payment Processors:</strong> Transaction confirmations and payment status from Hubtel and other payment providers</li>
              <li><strong>Analytics Services:</strong> Aggregated usage statistics from Vercel Analytics and other analytics tools</li>
              <li><strong>Verification Services:</strong> Identity verification results from third-party verification providers</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">
              We use your information for the following purposes:
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Platform Services</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Create and manage your user account</li>
              <li>Process event registrations and ticket purchases</li>
              <li>Facilitate venue bookings and availability management</li>
              <li>Enable event voting and contestant management</li>
              <li>Generate and deliver QR code tickets</li>
              <li>Process payments and manage financial transactions</li>
              <li>Send event confirmations, reminders, and updates</li>
              <li>Manage role requests (organizer, venue owner applications)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Communication</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Send transactional emails (order confirmations, password resets, account notifications)</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Send marketing communications about featured events and platform updates (with your consent)</li>
              <li>Notify organizers of new bookings, ticket sales, and revenue updates</li>
              <li>Alert venue owners of booking requests and confirmations</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Personalization</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Recommend events based on your preferences, browsing history, and saved events</li>
              <li>Customize your feed with relevant categories and locations</li>
              <li>Remember your preferences and settings</li>
              <li>Display personalized content and featured events</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.4 Analytics and Improvement</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Analyze platform usage patterns and user behavior</li>
              <li>Monitor event engagement metrics (views, locks, shares, clicks)</li>
              <li>Calculate engagement scores for featured event algorithms</li>
              <li>Track organizer and event performance analytics</li>
              <li>Identify and fix technical issues</li>
              <li>Improve platform features and user experience</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.5 Security and Fraud Prevention</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Verify user identities and prevent fraud</li>
              <li>Detect and prevent unauthorized access</li>
              <li>Monitor for suspicious activity and policy violations</li>
              <li>Investigate and resolve disputes</li>
              <li>Enforce our Terms of Service</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.6 Legal Compliance</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Comply with the Data Protection Act, 2012 (Act 843) and other Ghanaian laws</li>
              <li>Respond to lawful requests from the Ghana Police Service, courts, and regulatory authorities</li>
              <li>Comply with the Electronic Transactions Act, 2008 (Act 772) for electronic commerce</li>
              <li>Meet obligations under the Income Tax Act, 2015 (Act 896) and VAT Act, 2013 (Act 870)</li>
              <li>Protect our rights, property, and safety as permitted under Ghanaian law</li>
              <li>Maintain financial records in accordance with Companies Act, 2019 (Act 992)</li>
            </ul>
          </section>

          {/* How We Share Your Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Share Your Information</h2>
            <p className="text-gray-700 mb-4">
              We may share your information in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 With Event Organizers and Venue Owners</h3>
            <p className="text-gray-700 mb-4">
              When you purchase tickets or book venues, we share your contact information (name, email, phone number) with the respective organizer or venue owner to facilitate event coordination and communication.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 With Payment Processors</h3>
            <p className="text-gray-700 mb-4">
              We share payment information with Hubtel and other payment service providers to process transactions. These providers have their own privacy policies governing the use of your information.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 With Service Providers</h3>
            <p className="text-gray-700 mb-4">
              We share information with trusted third-party service providers who help us operate our Platform:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Vercel:</strong> Platform hosting and deployment</li>
              <li><strong>Email Services:</strong> Transactional and marketing email delivery</li>
              <li><strong>SMS Providers:</strong> SMS notifications and alerts</li>
              <li><strong>Cloud Storage:</strong> Image and file hosting services</li>
              <li><strong>Analytics Tools:</strong> Vercel Analytics and Google Vision for image moderation</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 Public Information</h3>
            <p className="text-gray-700 mb-4">
              Certain information is publicly visible on our Platform:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Organizer and venue owner public profiles (name, bio, social links)</li>
              <li>Public event details (title, description, date, location, images)</li>
              <li>Public venue information (name, address, photos, amenities)</li>
              <li>Event ratings and reviews (with your display name)</li>
              <li>Event engagement metrics (attendee count, popularity indicators)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.5 Business Transfers</h3>
            <p className="text-gray-700 mb-4">
              If we are involved in a merger, acquisition, asset sale, or bankruptcy, your information may be transferred as part of that transaction. We will notify you of any such change.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.6 Legal Requirements</h3>
            <p className="text-gray-700 mb-4">
              We may disclose your information if required by Ghanaian law, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Court orders issued by Ghanaian courts under the Courts Act, 1993 (Act 459)</li>
              <li>Lawful requests from the Ghana Police Service under the Police Service Act, 1970 (Act 350)</li>
              <li>Compliance with the Economic and Organised Crime Office (EOCO) Act, 2010 (Act 804)</li>
              <li>Requirements under the Anti-Money Laundering Act, 2020 (Act 1044)</li>
              <li>Obligations under the Cybersecurity Act, 2020 (Act 1038)</li>
              <li>Protecting our legal rights under the Constitution of Ghana, 1992</li>
              <li>Preventing fraud and ensuring public safety as required by law</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.7 With Your Consent</h3>
            <p className="text-gray-700 mb-4">
              We may share your information with third parties when you give us explicit consent to do so, in accordance with Section 11 of the Data Protection Act, 2012 (Act 843).
            </p>
          </section>

          {/* Data Storage and Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Storage and Security</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Data Storage</h3>
            <p className="text-gray-700 mb-4">
              Your information is stored on secure servers provided by Supabase and Vercel. While data may be processed internationally, we ensure compliance with the Data Protection Act, 2012 (Act 843) which permits cross-border data transfer when adequate safeguards are in place (Section 40). We maintain data processing agreements with our service providers to protect your rights under Ghanaian law.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Security Measures</h3>
            <p className="text-gray-700 mb-4">
              In compliance with Section 19 of the Data Protection Act, we implement appropriate technical and organizational measures to protect your information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Encryption of data in transit using SSL/TLS as required by the Electronic Transactions Act, 2008</li>
              <li>Encryption of sensitive data at rest in compliance with security standards</li>
              <li>Secure authentication using industry-standard protocols</li>
              <li>Row-level security policies and access controls</li>
              <li>Regular security audits in line with the Cybersecurity Act, 2020 (Act 1038)</li>
              <li>Monitoring for unauthorized access and breach detection systems</li>
              <li>Staff training on data protection obligations under Ghanaian law</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Data Retention</h3>
            <p className="text-gray-700 mb-4">
              In accordance with Section 20 of the Data Protection Act, we retain your information only as long as necessary to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Provide our services and maintain your account</li>
              <li>Comply with the Income Tax Act, 2015 (Act 896) - 6 years for financial records</li>
              <li>Meet obligations under the Companies Act, 2019 (Act 992) for business records</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Comply with other legal retention requirements</li>
            </ul>
            <p className="text-gray-700 mb-4">
              After you delete your account, we will delete or anonymize your personal information within 90 days, except where retention is required by Ghanaian law or legitimate business purposes as permitted under the Data Protection Act.
            </p>
          </section>

          {/* Your Privacy Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Privacy Rights Under Ghanaian Law</h2>
            <p className="text-gray-700 mb-4">
              Under the Data Protection Act, 2012 (Act 843), you have the following rights regarding your personal data:
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Right of Access (Section 31)</h3>
            <p className="text-gray-700 mb-4">
              You have the right to request confirmation of whether we process your personal data and to access such data. You can view and download your data through your account settings or by submitting a formal request to our Data Protection Officer.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 Right to Correction (Section 30)</h3>
            <p className="text-gray-700 mb-4">
              You have the right to request correction of inaccurate or incomplete personal data. You can update your profile information, preferences, and account details at any time through your account settings.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 Right to Erasure (Section 32)</h3>
            <p className="text-gray-700 mb-4">
              You can request deletion of your personal data by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Using the "Delete Account" option in your account settings</li>
              <li>Contacting our Data Protection Officer at dpo@locked.com</li>
              <li>Filing a request with the Data Protection Commission of Ghana</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Note: We may retain certain information where required by law (e.g., tax records under the Income Tax Act) or where we have a legitimate interest as permitted under the Data Protection Act.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.4 Right to Object to Processing (Section 33)</h3>
            <p className="text-gray-700 mb-4">
              You can object to the processing of your personal data for direct marketing purposes at any time by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Clicking the "unsubscribe" link in any marketing email</li>
              <li>Adjusting your email preferences in account settings</li>
              <li>Contacting us at lockedeventsgh@gmail.com</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Note: You will still receive transactional communications necessary for service delivery.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.5 Right to Lodge a Complaint</h3>
            <p className="text-gray-700 mb-4">
              If you believe your data protection rights have been violated, you have the right to lodge a complaint with:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-gray-700 font-semibold mb-2">Data Protection Commission of Ghana</p>
              <p className="text-gray-700">Address: No. 18 Dr. Isert Road, North Ridge, Accra</p>
              <p className="text-gray-700">Email: info@dataprotection.org.gh</p>
              <p className="text-gray-700">Phone: +233 (0)302 971 370</p>
              <p className="text-gray-700">Website: www.dataprotection.org.gh</p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.6 Cookie Preferences</h3>
            <p className="text-gray-700 mb-4">
              You can manage cookie preferences through your browser settings. However, disabling certain cookies may limit platform functionality.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.6 Object to Processing</h3>
            <p className="text-gray-700 mb-4">
              You have the right to object to certain types of data processing, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Direct marketing activities</li>
              <li>Automated decision-making and profiling</li>
              <li>Processing based on legitimate interests</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.7 Exercising Your Rights</h3>
            <p className="text-gray-700 mb-4">
              To exercise any of these rights, please contact us at lockedeventsgh@gmail.com. We will respond to your request within 30 days.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              Our Platform is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at lockedeventsgh@gmail.com, and we will delete such information.
            </p>
            <p className="text-gray-700">
              Users between 13 and 18 years old must have parental consent to use our Platform and make purchases.
            </p>
          </section>

          {/* International Data Transfers */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfers</h2>
            <p className="text-gray-700 mb-4">
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country.
            </p>
            <p className="text-gray-700">
              We take appropriate safeguards to ensure that your personal information remains protected in accordance with this Privacy Policy, including the use of standard contractual clauses and ensuring our service providers maintain appropriate security measures.
            </p>
          </section>

          {/* Third-Party Links and Services */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Third-Party Links and Services</h2>
            <p className="text-gray-700 mb-4">
              Our Platform may contain links to third-party websites, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Event organizer websites and social media profiles</li>
              <li>Venue websites and booking platforms</li>
              <li>Social media platforms (Facebook, Twitter, Instagram, LinkedIn, TikTok)</li>
              <li>Payment processor websites</li>
              <li>Partner and affiliate websites</li>
            </ul>
            <p className="text-gray-700">
              We are not responsible for the privacy practices of these third-party sites. We encourage you to read their privacy policies before providing any information.
            </p>
          </section>

          {/* Cookies and Tracking Technologies */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Cookies and Tracking Technologies</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 Types of Cookies We Use</h3>
            <ul className="list-disc pl-6 space-y-3 text-gray-700 mb-6">
              <li>
                <strong>Essential Cookies:</strong> Required for platform functionality, including authentication, session management, and security
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your settings, view preferences, and language choices
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand how users interact with our Platform (Vercel Analytics)
              </li>
              <li>
                <strong>Marketing Cookies:</strong> Track visits across websites for advertising purposes (with your consent)
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 Local Storage</h3>
            <p className="text-gray-700 mb-4">
              We use browser local storage to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Store user preferences (view modes, filters, saved searches)</li>
              <li>Cache recently viewed events for recommendations</li>
              <li>Maintain locked/saved events for quick access</li>
              <li>Store authentication tokens securely</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.3 Managing Cookies</h3>
            <p className="text-gray-700 mb-4">
              You can control cookies through your browser settings. For more information, see our{' '}
              <Link href="/pages/legal/cookie-policy" className="text-primary hover:underline">
                Cookie Policy
              </Link>.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
              <li>Posting the updated Privacy Policy on this page with a new "Last Updated" date</li>
              <li>Sending an email notification to your registered email address</li>
              <li>Displaying a prominent notice on our Platform</li>
            </ul>
            <p className="text-gray-700">
              Your continued use of the Platform after changes become effective constitutes your acceptance of the revised Privacy Policy.
            </p>
          </section>

          {/* Contact Us */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact Us</h2>
            <p className="text-gray-700 mb-6">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">Email</p>
                  <a href="mailto:privacy@locked.com" className="text-primary hover:underline">
                    privacy@locked.com
                  </a>
                  <p className="text-sm text-gray-600 mt-1">For privacy-specific inquiries</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">General Support</p>
                  <a href="mailto:lockedeventsgh@gmail.com" className="text-primary hover:underline">
                    lockedeventsgh@gmail.com
                  </a>
                  <p className="text-sm text-gray-600 mt-1">For general questions and support</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">Phone</p>
                  <p className="text-gray-700">+233 XX XXX XXXX</p>
                  <p className="text-sm text-gray-600 mt-1">Available Monday - Friday, 9AM - 5PM GMT</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">Mailing Address</p>
                  <p className="text-gray-700">
                    Locked Platform<br />
                    [Address Line 1]<br />
                    [City], Ghana
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Additional Legal Links */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Related Legal Documents</h2>
            <p className="text-gray-700 mb-4">
              For more information about how we operate, please review our related legal documents:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <Link href="/pages/legal/terms-of-service" className="text-primary hover:underline">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/pages/legal/cookie-policy" className="text-primary hover:underline">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </section>

          {/* Acknowledgment */}
          <section className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Acknowledgment</h3>
            <p className="text-gray-700">
              By using Locked, you acknowledge that you have read and understood this Privacy Policy and agree to its terms. If you do not agree with this Privacy Policy, please do not use our Platform.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
