import React from 'react';
import { Check, X, Award } from 'lucide-react';

interface BenefitProps {
  name: string;
  description: string;
  includedInPlatinum: boolean;
  includedInElite: boolean;
}

const Benefit: React.FC<BenefitProps> = ({ name, description, includedInPlatinum, includedInElite }) => (
  <div className="grid grid-cols-5 py-4 border-b border-neutral-200">
    <div className="col-span-3">
      <h3 className="font-medium text-neutral-800">{name}</h3>
      <p className="text-sm text-neutral-500">{description}</p>
    </div>
    <div className="flex items-center justify-center">
      {includedInPlatinum ? 
        <Check className="w-5 h-5 text-green-500" /> : 
        <X className="w-5 h-5 text-neutral-300" />
      }
    </div>
    <div className="flex items-center justify-center">
      {includedInElite ? 
        <Check className="w-5 h-5 text-green-500" /> : 
        <X className="w-5 h-5 text-neutral-300" />
      }
    </div>
  </div>
);

export function PremiumBenefitsTable() {
  const benefits = [
    {
      name: "Discounted Platform Fees",
      description: "Reduced commission on ticket sales and merchandise",
      includedInPlatinum: true,
      includedInElite: true
    },
    {
      name: "Promo Boosts",
      description: "Monthly featured listings or homepage spotlights",
      includedInPlatinum: true,
      includedInElite: true
    },
    {
      name: "Official Merchandise",
      description: "Free or discounted merchandise to promote events",
      includedInPlatinum: false,
      includedInElite: true
    },
    {
      name: "Analytics Pro Suite",
      description: "Advanced dashboards (user heatmaps, conversion rates)",
      includedInPlatinum: true,
      includedInElite: true
    },
    {
      name: "Priority Support",
      description: "Dedicated support line with 24–48 hours resolution times",
      includedInPlatinum: true,
      includedInElite: true
    },
    {
      name: "Custom Event Templates",
      description: "Unlock premium design templates and landing pages",
      includedInPlatinum: false,
      includedInElite: true
    },
    {
      name: "Audience Insights",
      description: "Access anonymized demographic and interest data",
      includedInPlatinum: false,
      includedInElite: true
    },
    {
      name: "Invitation to Beta Features",
      description: "Early access to Locked's newest tools and experiments",
      includedInPlatinum: true,
      includedInElite: true
    }
  ];

  return (
    <div className="w-full overflow-hidden bg-white rounded-xl border border-neutral-200">
      <div className="p-6 border-b border-neutral-200">
        <h2 className="text-2xl font-bold">Premium Organizer Benefits</h2>
        <p className="mt-2 text-neutral-600">
          Exclusive features and tools for top-performing organizers on Locked
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header */}
          <div className="grid grid-cols-5 bg-neutral-50 py-3 px-6 font-medium border-b border-neutral-200">
            <div className="col-span-3">Feature</div>
            <div className="flex items-center justify-center gap-2">
              <Award className="w-4 h-4 text-slate-500" />
              <span>Platinum</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Elite</span>
            </div>
          </div>
          
          {/* Benefits */}
          <div className="px-6">
            {benefits.map((benefit, index) => (
              <Benefit key={index} {...benefit} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}