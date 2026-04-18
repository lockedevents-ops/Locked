"use client";

import { Cookie, Shield, Settings, Eye, ExternalLink, Info } from 'lucide-react';
import Link from 'next/link';

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-16 pt-32 md:pt-36">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Cookie className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Cookie Policy</h1>
          </div>
          <p className="text-lg text-white/90">
            Last Updated: November 10, 2025
          </p>
          <p className="text-sm text-white/80 mt-2">
            Complies with the Data Protection Act, 2012 (Act 843) of Ghana
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          
          {/* Introduction */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">About This Cookie Policy</h2>
            <p className="text-gray-700">
              This Cookie Policy explains how Locked ("we," "us," or "our") uses cookies and similar tracking technologies on our platform in compliance with the Data Protection Act, 2012 (Act 843) of Ghana and the Electronic Transactions Act, 2008 (Act 772).
            </p>
            <p className="text-gray-700 mt-2">
              Under Section 11 of the Data Protection Act, 2012 (Act 843), we require your informed consent before placing non-essential cookies on your device. By using Locked, you acknowledge that you have been informed about our cookie practices and provide consent as required by Ghanaian law.
            </p>
            <p className="text-gray-700 mt-2">
              For information about how we process your personal data, please see our <Link href="/pages/legal/privacy-policy" className="text-blue-700 font-medium hover:underline">Privacy Policy</Link>.
            </p>
          </section>
          
          {/* 1. What Are Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              1. What Are Cookies?
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They help websites remember your preferences and improve your browsing experience.
              </p>
              <p>
                Under the Electronic Transactions Act, 2008 (Act 772) and the Data Protection Act, 2012 (Act 843) of Ghana, cookies may be used for legitimate purposes with your consent. Cookies contain information such as your language preferences, login status, and site settings.
              </p>
              <p>
                Cookies do not contain personal information like your name or email address unless you explicitly provide it. When cookies do contain personal data, such data is processed in accordance with the Data Protection Act, 2012 (Act 843) and our Privacy Policy.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Your Rights Under Ghanaian Law:</strong> Under the Data Protection Act, 2012 (Act 843), you have the right to object to processing of your personal data (Section 33). Most modern web browsers allow you to control cookies through their settings. You can block or delete cookies, but this may affect your experience on Locked.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Why We Use Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. Why We Use Cookies
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Locked uses cookies to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Keep you signed in:</strong> Remember your login session so you don't have to sign in repeatedly</li>
                <li><strong>Enhance security:</strong> Protect your account from unauthorized access and prevent fraud</li>
                <li><strong>Remember preferences:</strong> Store your language, view modes, and other settings</li>
                <li><strong>Analyze usage:</strong> Understand how users interact with our platform to improve features</li>
                <li><strong>Provide personalized content:</strong> Show relevant events and recommendations based on your interests</li>
                <li><strong>Measure performance:</strong> Track which events and features are most popular</li>
                <li><strong>Support marketing:</strong> Deliver targeted content and measure campaign effectiveness</li>
              </ul>
            </div>
          </section>

          {/* 3. Types of Cookies We Use */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. Types of Cookies We Use
            </h2>
            <div className="space-y-6 text-gray-700">
              
              {/* 3.1 Essential Cookies */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-lg font-semibold mb-2 text-red-700">3.1 Essential Cookies (Required)</h3>
                <p className="mb-2">
                  These cookies are necessary for the platform to function. You cannot opt out of these cookies.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 pr-4">Cookie Name</th>
                        <th className="text-left py-2 pr-4">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">sb-access-token</td>
                        <td className="py-2 pr-4">Authentication and session management</td>
                        <td className="py-2">7 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">sb-refresh-token</td>
                        <td className="py-2 pr-4">Automatic login renewal</td>
                        <td className="py-2">30 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">csrf-token</td>
                        <td className="py-2 pr-4">Security and CSRF protection</td>
                        <td className="py-2">Session</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3.2 Functional Cookies */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold mb-2 text-blue-700">3.2 Functional Cookies (Optional)</h3>
                <p className="mb-2">
                  These cookies enhance your experience by remembering your preferences and settings.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 pr-4">Cookie/Storage</th>
                        <th className="text-left py-2 pr-4">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">eventsViewMode</td>
                        <td className="py-2 pr-4">Remember grid/list view preference</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">draftEventsViewMode</td>
                        <td className="py-2 pr-4">Remember draft events view preference</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">adminSidebarCollapsed</td>
                        <td className="py-2 pr-4">Remember sidebar state</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-xs">language</td>
                        <td className="py-2 pr-4">Store language preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3.3 Analytics Cookies */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold mb-2 text-green-700">3.3 Analytics Cookies (Optional)</h3>
                <p className="mb-2">
                  These cookies help us understand how users interact with Locked so we can improve the platform.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 pr-4">Service</th>
                        <th className="text-left py-2 pr-4">Purpose</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-2 pr-4">Vercel Analytics</td>
                        <td className="py-2 pr-4">Page views, performance metrics, user flows</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Vercel Speed Insights</td>
                        <td className="py-2 pr-4">Website performance and loading times</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Custom Analytics</td>
                        <td className="py-2 pr-4">Event views, locks, clicks, and engagement</td>
                        <td className="py-2">Session</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3.4 Marketing Cookies */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-lg font-semibold mb-2 text-purple-700">3.4 Marketing Cookies (Optional)</h3>
                <p className="mb-2">
                  These cookies help us deliver relevant content and measure the effectiveness of our campaigns.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 pr-4">Purpose</th>
                        <th className="text-left py-2 pr-4">Description</th>
                        <th className="text-left py-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="py-2 pr-4">Featured Events</td>
                        <td className="py-2 pr-4">Track engagement with promoted events</td>
                        <td className="py-2">30 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Recommendations</td>
                        <td className="py-2 pr-4">Personalize event suggestions</td>
                        <td className="py-2">90 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Campaign Tracking</td>
                        <td className="py-2 pr-4">Measure marketing campaign performance</td>
                        <td className="py-2">30 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Local Storage and Session Storage */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Local Storage and Session Storage
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                In addition to cookies, Locked uses browser local storage and session storage to enhance functionality:
              </p>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">4.1 Local Storage</h3>
                <p className="mb-2">Persistent data stored on your device that doesn't expire:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>User Preferences:</strong> View modes, theme settings, sidebar states</li>
                  <li><strong>Locked Events:</strong> List of events you've locked for quick access</li>
                  <li><strong>Draft Data:</strong> Temporarily saves form data to prevent loss</li>
                  <li><strong>Recent Searches:</strong> Your recent event and venue searches</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">4.2 Session Storage</h3>
                <p className="mb-2">Temporary data cleared when you close your browser:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Navigation State:</strong> Current page and scroll position</li>
                  <li><strong>Form State:</strong> Temporary form data during multi-step processes</li>
                  <li><strong>Filter Settings:</strong> Active filters on discover and search pages</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Third-Party Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. Third-Party Cookies and Cross-Border Data Transfer
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Locked uses third-party services that may set their own cookies. Under Section 40 of the Data Protection Act, 2012 (Act 843), cross-border transfers of personal data must comply with Ghanaian law. We ensure that third-party services provide adequate protection for your data.
              </p>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Vercel (United States)</h3>
                  <p className="text-sm mb-2">Hosting and analytics platform - Cross-border data transfer</p>
                  <ul className="text-sm list-disc pl-6 space-y-1">
                    <li>Analytics cookies for page views and performance</li>
                    <li>Speed Insights cookies for performance monitoring</li>
                    <li>Data transferred with adequate safeguards per Act 843, Section 40</li>
                    <li>Privacy Policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">vercel.com/legal/privacy-policy</a></li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Supabase (United States)</h3>
                  <p className="text-sm mb-2">Database and authentication platform - Cross-border data transfer</p>
                  <ul className="text-sm list-disc pl-6 space-y-1">
                    <li>Authentication cookies for session management</li>
                    <li>Security cookies for CSRF protection (Cybersecurity Act, 2020 [Act 1038])</li>
                    <li>Data transferred with encryption and security measures</li>
                    <li>Privacy Policy: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">supabase.com/privacy</a></li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Hubtel (Ghana)</h3>
                  <p className="text-sm mb-2">Payment processing platform - Licensed by Bank of Ghana</p>
                  <ul className="text-sm list-disc pl-6 space-y-1">
                    <li>Payment session cookies</li>
                    <li>Fraud prevention and security cookies</li>
                    <li>Complies with National Payment Systems Act, 2003 (Act 662)</li>
                    <li>Subject to Bank of Ghana regulations</li>
                    <li>Privacy Policy: <a href="https://hubtel.com/privacy" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">hubtel.com/privacy</a></li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Google Cloud (United States)</h3>
                  <p className="text-sm mb-2">Vision API for image moderation - Cross-border data transfer</p>
                  <ul className="text-sm list-disc pl-6 space-y-1">
                    <li>API authentication cookies</li>
                    <li>Data transferred with adequate safeguards per Act 843</li>
                    <li>Privacy Policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">policies.google.com/privacy</a></li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> By using Locked, you consent to these cross-border data transfers as permitted under Section 40 of the Data Protection Act, 2012 (Act 843). We ensure all third-party processors maintain adequate data protection standards comparable to Ghanaian law.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Managing Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              6. How to Manage Cookies - Your Rights Under Ghanaian Law
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Under Section 33 of the Data Protection Act, 2012 (Act 843), you have the right to object to the processing of your personal data, including data collected through cookies. You have several options to control and manage cookies:
              </p>

              <div>
                <h3 className="text-lg font-semibold mb-2">6.1 Browser Settings</h3>
                <p className="mb-2">Most browsers allow you to exercise your rights under Act 843 by:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Viewing and deleting existing cookies (Right of Access - Section 31)</li>
                  <li>Blocking third-party cookies</li>
                  <li>Blocking all cookies (not recommended for Locked functionality)</li>
                  <li>Clearing cookies when closing your browser</li>
                </ul>
                
                <div className="mt-4 space-y-2">
                  <p className="font-medium">Cookie management guides:</p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">Google Chrome</a></li>
                    <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">Mozilla Firefox</a></li>
                    <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">Safari</a></li>
                    <li><a href="https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">Microsoft Edge</a></li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">6.2 Platform Settings</h3>
                <p className="mb-2">
                  Locked provides cookie preferences in your account settings (coming soon):
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Enable/disable analytics cookies</li>
                  <li>Enable/disable marketing cookies</li>
                  <li>Clear local storage data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">6.3 Impact of Disabling Cookies</h3>
                <p className="mb-2">
                  If you disable cookies, some features may not work properly:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Essential cookies disabled:</strong> You cannot sign in or use authenticated features</li>
                  <li><strong>Functional cookies disabled:</strong> Preferences won't be saved between visits</li>
                  <li><strong>Analytics cookies disabled:</strong> We can't improve based on usage patterns</li>
                  <li><strong>Marketing cookies disabled:</strong> You'll see less relevant event recommendations</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. Cookie Consent */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. Cookie Consent Under Data Protection Act, 2012 (Act 843)
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Section 11 of the Data Protection Act, 2012 (Act 843) requires that we obtain your informed consent before processing personal data through non-essential cookies. When you first visit Locked, you'll see a cookie consent banner where you can:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Accept All:</strong> Provide consent for all cookies including optional ones (functional, analytics, marketing)</li>
                <li><strong>Reject Optional:</strong> Only essential cookies will be used (authentication, security)</li>
                <li><strong>Customize:</strong> Choose which types of cookies to allow based on your preferences</li>
              </ul>
              <p className="mt-3">
                You can withdraw your consent at any time by changing your cookie preferences through your account settings. This right is protected under Section 33 of the Data Protection Act, 2012 (Act 843).
              </p>
              <p className="mt-2">
                Essential cookies that are necessary for platform functionality do not require consent under Ghanaian law, as they are required for the legitimate performance of our services.
              </p>
            </div>
          </section>

          {/* 8. Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              8. Cookie Security Under Ghanaian Law
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                We implement security measures for cookies in compliance with Section 19 of the Data Protection Act, 2012 (Act 843), the Electronic Transactions Act, 2008 (Act 772), and the Cybersecurity Act, 2020 (Act 1038):
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encrypted cookies:</strong> Sensitive cookies are encrypted to protect your data</li>
                <li><strong>Secure transmission:</strong> All cookies are transmitted over HTTPS as required by the Electronic Transactions Act</li>
                <li><strong>HttpOnly flag:</strong> Prevents JavaScript access to authentication cookies (CSRF protection)</li>
                <li><strong>SameSite attribute:</strong> Protects against cross-site request forgery attacks</li>
                <li><strong>Regular security audits:</strong> We conduct security assessments as required by the Cybersecurity Act, 2020 (Act 1038)</li>
                <li><strong>Data minimization:</strong> We only collect cookie data necessary for legitimate purposes (Section 14 of Act 843)</li>
                <li><strong>Access controls:</strong> Strict internal controls limit who can access cookie data</li>
              </ul>
              <p className="mt-3">
                If you believe there has been a security breach affecting your cookie data, please contact our Data Protection Officer immediately at <a href="mailto:dpo@locked.com" className="text-black font-medium hover:underline">dpo@locked.com</a>.
              </p>
            </div>
          </section>

          {/* 9. Do Not Track */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              9. Do Not Track (DNT) Signals
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Some browsers have a "Do Not Track" (DNT) feature that signals to websites you prefer not to be tracked.
              </p>
              <p>
                Currently, there is no universal standard for how websites should respond to DNT signals. Locked respects your browser's DNT signal by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Disabling non-essential analytics when DNT is enabled</li>
                <li>Minimizing data collection to essential functions only</li>
                <li>Not sharing data with third-party advertisers</li>
              </ul>
            </div>
          </section>

          {/* 10. Updates to Cookie Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              10. Updates to This Cookie Policy
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our practices, technology, or legal requirements under Ghanaian law (including the Data Protection Act, 2012 [Act 843] and other applicable legislation). We will notify you of significant changes by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Posting the updated policy on this page with a revised "Last Updated" date</li>
                <li>Sending an email notification to your registered address for material changes</li>
                <li>Displaying a prominent notification on the platform</li>
                <li>Requesting renewed consent where required by the Data Protection Act</li>
              </ul>
              <p className="mt-3">
                Under the Electronic Transactions Act, 2008 (Act 772), your continued use of the platform after notification of changes constitutes acceptance of the updated Cookie Policy. If you do not agree with the changes, you may withdraw consent and discontinue use of non-essential cookies.
              </p>
              <p className="mt-2">
                We encourage you to review this policy periodically to stay informed about how we use cookies and your rights under Ghanaian law.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us About Cookies</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about our use of cookies or wish to exercise your rights under the Data Protection Act, 2012 (Act 843), please contact us:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Email
                </h3>
                <p className="text-sm text-gray-600 mb-2">General cookie inquiries:</p>
                <a href="mailto:privacy@locked.com" className="text-black hover:underline">
                  privacy@locked.com
                </a>
                <p className="text-sm text-gray-600 mt-3 mb-2">Data Protection Officer:</p>
                <a href="mailto:dpo@locked.com" className="text-black hover:underline">
                  dpo@locked.com
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

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Data Protection Commission of Ghana</h3>
              <p className="text-sm text-gray-700 mb-3">
                If you are not satisfied with our response to your cookie-related concerns or wish to lodge a complaint under the Data Protection Act, 2012 (Act 843), you may contact:
              </p>
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>Address:</strong> No. 18 Dr. Isert Road, North Ridge, Accra</p>
                <p><strong>Email:</strong> <a href="mailto:info@dataprotection.org.gh" className="text-blue-700 hover:underline">info@dataprotection.org.gh</a></p>
                <p><strong>Phone:</strong> +233 (0)302 971 370</p>
                <p><strong>Website:</strong> <a href="https://www.dataprotection.org.gh" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">www.dataprotection.org.gh</a></p>
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
                <p className="text-sm text-gray-600">Learn how we collect, use, and protect your data under Ghanaian law</p>
              </Link>

              <Link 
                href="/pages/legal/terms-of-service"
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-black transition-colors group"
              >
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-black flex items-center gap-2">
                  Terms of Service
                  <ExternalLink className="w-4 h-4" />
                </h3>
                <p className="text-sm text-gray-600">Read our terms governed by the laws of Ghana</p>
              </Link>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
