import React from 'react';

export default function EmblemCrest({ size = 'md' }) {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  return (
    <div className="flex items-center gap-3">
      {/* Ashoka Lion Capital SVG Representation */}
      <div className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-gov-ashoka to-gov-navy border border-gov-ashokaLight/30 text-white shadow-tactile ${
        isLarge ? 'w-12 h-12' : isSmall ? 'w-8 h-8' : 'w-10 h-10'
      }`}>
        <svg viewBox="0 0 100 100" className="w-4/5 h-4/5 fill-current text-amber-300">
          {/* Ashoka Wheel Chakra & Base */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="50" r="8" fill="currentColor" />
          {/* 24 Spoke representation */}
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="8"
              x2="50"
              y2="92"
              stroke="currentColor"
              strokeWidth="2.5"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest font-semibold uppercase text-amber-400">
            सत्यमेव जयते
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-mono border border-blue-800">
            GOVTECH INDIA
          </span>
        </div>
        <span className={`font-bold tracking-tight text-white ${isLarge ? 'text-lg' : isSmall ? 'text-sm' : 'text-base'}`}>
          AICTE FDR Portal
        </span>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          National Security Deposit & Irrevocable Escrow Framework
        </span>
      </div>
    </div>
  );
}
