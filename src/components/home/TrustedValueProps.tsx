"use client";

import React from "react";

interface TrustedValuePropsProps {
  className?: string;
  variant?: "dark" | "light";
}

const VALUE_POINTS = [
  {
    title: "Trusted Platform",
    description: "Ghana's leading event discovery platform",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Creator Empowered",
    description: "Focus on creating memorable experiences",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    title: "Seamless Payouts",
    description: "Quick and secure payment processing",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Growth Focused",
    description: "Analytics to help your events succeed",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

export function TrustedValueProps({ className = "", variant = "dark" }: TrustedValuePropsProps) {
  const isDark = variant === "dark";
  const titleColor = isDark ? "text-white" : "text-neutral-900";
  const descriptionColor = isDark ? "text-white/80" : "text-neutral-600";
  const iconBg = isDark ? "bg-white/20 text-white" : "bg-primary/10 text-primary";

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 ${className}`}>
      {VALUE_POINTS.map((item) => (
        <div key={item.title} className="text-center md:text-left">
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl backdrop-blur-sm mb-3 ${iconBg}`}>
            {item.icon}
          </div>
          <h3 className={`text-sm font-bold mb-1 ${titleColor}`}>{item.title}</h3>
          <p className={`text-xs leading-relaxed ${descriptionColor}`}>
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
