"use client";

import React from 'react';

interface AppleSpinnerProps {
  size?: number;
  className?: string;
}

export function AppleSpinner({ size = 28, className = '' }: AppleSpinnerProps) {
  const bars = Array.from({ length: 12 });
  const barWidth = Math.max(2, Math.round(size * 0.085));
  const barHeight = Math.max(6, Math.round(size * 0.26));
  const radius = Math.round(size * 0.38);

  return (
    <>
      <div
        className={`relative ${className}`.trim()}
        style={{ width: size, height: size }}
        aria-label="Loading"
        role="status"
      >
        {bars.map((_, index) => {
          const rotation = index * 30;
          const delay = -(1.2 - index * 0.1);
          return (
            <span
              key={index}
              className="absolute left-1/2 top-1/2 block bg-neutral-800/90"
              style={{
                width: barWidth,
                height: barHeight,
                marginLeft: -(barWidth / 2),
                marginTop: -(barHeight / 2),
                borderRadius: barWidth,
                transform: `rotate(${rotation}deg) translateY(-${radius}px)`,
                transformOrigin: `center ${radius}px`,
                animation: `apple-spinner-fade 1.2s linear infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      <style jsx>{`
        @keyframes apple-spinner-fade {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0.15;
          }
        }
      `}</style>
    </>
  );
}
