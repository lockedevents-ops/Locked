"use client";

import { Shield, Users, Zap, TrendingUp } from "lucide-react";

export function TrustSection() {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-br from-neutral-50 to-white border-b border-neutral-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Trusted Platform */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4 mx-auto">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Trusted Platform</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Ghana's leading event discovery platform, connecting thousands of creators with their audience.
            </p>
          </div>

          {/* Organizer-Focused */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4 mx-auto">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Creator Empowered</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Built with organizers in mind. We handle the tech so you can focus on creating memorable experiences.
            </p>
          </div>

          {/* Fast Payments */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4 mx-auto">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Seamless Payouts</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Automated, secure payment processing. Get your earnings quickly and hassle-free, every single time.
            </p>
          </div>

          {/* Proven Track Record */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4 mx-auto">
              <TrendingUp className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Growth Focused</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Powerful analytics and marketing tools designed to help your events reach more people and succeed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
