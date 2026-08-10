'use client';

import React from 'react';

interface TourSpotlightProps {
  targetRect: DOMRect | null;
}

export default function TourSpotlight({ targetRect }: TourSpotlightProps) {
  if (!targetRect) return null;

  return (
    <>
      {/* Spotlight Ring */}
      <div 
        className="fixed z-[90] pointer-events-none border-2 border-indigo-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
        aria-hidden="true"
      />
    </>
  );
}
