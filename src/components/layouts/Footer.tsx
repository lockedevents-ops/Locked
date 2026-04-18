"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faXTwitter, faFacebook, faYoutube, faTiktok, faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import { isVenuesEnabled } from '@/lib/network';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const venuesEnabled = isVenuesEnabled();
  const pathname = usePathname();

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault();
      const heroSection = document.querySelector('section');
      if (heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <footer
      className="bg-black border-t border-neutral-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* 
        MOBILE FOOTER - DISABLED: Mobile devices now use the default footer below
        This custom mobile footer was using md:hidden wrapper and simplified styling
        
        <div className="md:hidden py-4 px-4">
          <div className="space-y-4">
            <div className="flex flex-row justify-between items-center">
              <p className="text-sm text-neutral-400">
                © {currentYear} Locked. All rights reserved.
              </p>
              <div className="flex space-x-3">
                [Social media icons would go here]
              </div>
            </div>
            <div className="flex justify-start space-x-4 pt-2 border-t border-neutral-800">
              <Link href="/pages/legal/privacy-policy" className="text-xs text-neutral-400 hover:text-accent">
                Privacy Policy
              </Link>
              <Link href="/pages/legal/terms-of-service" className="text-xs text-neutral-400 hover:text-accent">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      */}

      {/* Desktop Footer - Full Version (Now used on all screen sizes including mobile) */}
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Information - Enhanced to replace About page */}
          <div>
            <Link href="/" className="flex items-center gap-2" onClick={handleLogoClick}>
              <img
                src="/locked-logo-text-white.png"
                alt="Locked Logo"
                className="h-4 w-auto object-contain"
                style={{ maxWidth: '140px' }}
              />
            </Link>
            <p className="mt-4 text-sm text-neutral-400">
              Ghana's premier event discovery, ticketing and voting platform.
              Connecting event organizers with attendees since 2023.
            </p>
            <p className="mt-3 text-sm text-neutral-400">
              Our mission is to make event discovery and participation seamless
              across Ghana, while empowering organizers with powerful tools.
            </p>
            <div className="mt-3">
              <Link
                href="/pages/about"
                className="text-sm text-accent font-medium transition-transform duration-200 transform hover:scale-105 hover:text-accent/90 focus:outline-none"
              >
                Learn more --
              </Link>
            </div>
            <div className="mt-4 flex space-x-4">
              <a href="https://www.instagram.com/lockedeventsgh?igsh=MXBlNHNwYnJlemh1Ng%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-accent transition-colors duration-200" title="Follow us on Instagram">
                <span className="sr-only">Instagram</span>
                <FontAwesomeIcon icon={faInstagram} className="h-6 w-6" />
              </a>
              <a href="https://x.com/lockedeventsgh?s=21" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-accent transition-colors duration-200" title="Follow us on X (Twitter)">
                <span className="sr-only">X (Twitter)</span>
                <FontAwesomeIcon icon={faXTwitter} className="h-6 w-6" />
              </a>
              <a href="https://www.facebook.com/share/1Emnd98pY7/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-accent transition-colors duration-200" title="Follow us on Facebook">
                <span className="sr-only">Facebook</span>
                <FontAwesomeIcon icon={faFacebook} className="h-6 w-6" />
              </a>
              <a href="https://youtube.com/@lockedevents?si=oGQc4lYAfc0f1vog" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-accent transition-colors duration-200" title="Subscribe on YouTube">
                <span className="sr-only">YouTube</span>
                <FontAwesomeIcon icon={faYoutube} className="h-6 w-6" />
              </a>
              <a href="https://www.tiktok.com/@lockedevents?_r=1&_t=ZM-91Iwu9XP2Ou" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-accent transition-colors duration-200" title="Follow us on TikTok">
                <span className="sr-only">TikTok</span>
                <FontAwesomeIcon icon={faTiktok} className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Quick Links - Removed About/Voting from main links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Quick Links</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/pages/discover" className="text-sm text-neutral-400 hover:text-accent">
                  Discover Events
                </Link>
              </li>
              {venuesEnabled && (
                <li>
                  <Link href="/pages/venues" className="text-sm text-neutral-400 hover:text-accent">
                    Find Venues
                  </Link>
                </li>
              )}
              <li>
                <Link href="/pages/team" className="text-sm text-neutral-400 hover:text-accent">
                  Our Team
                </Link>
              </li>
              <li>
                <Link href="/pages/pricing" className="text-sm text-neutral-400 hover:text-accent">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/pages/help/contact" className="text-sm text-neutral-400 hover:text-accent">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources - Now includes Voting Guide */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Resources</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/pages/guides/booking" className="text-sm text-neutral-400 hover:text-accent">
                  Event Booking Guide
                </Link>
              </li>
              <li>
                <Link href="/pages/guides/hosting" className="text-sm text-neutral-400 hover:text-accent">
                  Event Hosting Guide
                </Link>
              </li>
              <li>
                <Link href="/pages/guides/voting" className="text-sm text-neutral-400 hover:text-accent">
                  Voting Guide
                </Link>
              </li>
              <li>
                <Link href="/pages/help/faqs" className="text-sm text-neutral-400 hover:text-accent">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/pages/legal/privacy-policy" className="text-sm text-neutral-400 hover:text-accent">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/pages/legal/terms-of-service" className="text-sm text-neutral-400 hover:text-accent">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Get in Touch */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Get In Touch</h3>
            <ul className="mt-4 space-y-2">
              <li className="text-sm text-neutral-400">
                <span className="block font-medium text-white">Email:</span>
                <a href="mailto:lockedeventsgh@gmail.com" className="hover:text-accent">
                  lockedeventsgh@gmail.com
                </a>
              </li>
              <li className="text-sm text-neutral-400">
                <span className="block font-medium text-white">Phone:</span>
                <a href="tel:+233123456789" className="hover:text-accent">
                  +233 12 345 6789
                </a>
              </li>
              <li className="text-sm text-neutral-400">
                <span className="block font-medium text-white">Address:</span>
                <p>123 Independence Avenue<br />Accra, Ghana</p>
              </li>
            </ul>
            
            {/* Mobile App Download Links */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Download App</h4>
                <span className="text-xs text-accent font-medium">(Coming Soon)</span>
              </div>
              <div className="flex items-center gap-4">
                {/* App Store */}
                <div className="flex items-center gap-2 text-neutral-400 cursor-not-allowed opacity-60">
                  <FontAwesomeIcon icon={faApple} className="h-5 w-5" />
                  <span className="text-sm">App Store</span>
                </div>
                
                {/* Google Play */}
                <div className="flex items-center gap-2 text-neutral-400 cursor-not-allowed opacity-60">
                  <FontAwesomeIcon icon={faGooglePlay} className="h-4 w-4" />
                  <span className="text-sm">Google Play</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        </div>
      </div>
    
        {/* Bottom Bar - Copyright and Links (Now shown on all screen sizes) */}
        <div className="border-t border-neutral-800 mt-8 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-neutral-400">
              © {currentYear} Locked. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-2 md:mt-0">
              <Link href="/pages/legal/privacy-policy" className="text-sm text-neutral-400 hover:text-accent">
                Privacy Policy
              </Link>
              <Link href="/pages/legal/terms-of-service" className="text-sm text-neutral-400 hover:text-accent">
                Terms of Service
              </Link>
              <Link href="/pages/legal/cookie-policy" className="text-sm text-neutral-400 hover:text-accent">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
