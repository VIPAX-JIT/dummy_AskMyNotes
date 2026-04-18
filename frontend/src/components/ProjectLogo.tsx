import React from "react";

export function ProjectLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full text-yellow-300 pointer-events-none scale-[1.35] translate-y-1 translate-x-1"
        viewBox="0 0 100 100"
      >
        <path d="M 15 40 Q 50 10 85 50 T 25 85 Z" fill="currentColor" />
      </svg>
      <svg
        className="relative z-10 w-full h-full text-slate-900"
        viewBox="0 0 100 100"
      >
        <path
          d="M 65 72 L 95 100 L 85 50 Z"
          fill="white"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M 10 25 Q 30 15 50 25 Q 70 15 90 25 L 90 75 Q 70 65 50 75 Q 30 65 10 75 Z"
          fill="white"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M 50 25 L 50 75"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M 22 40 Q 30 37 40 39" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M 20 54 Q 30 51 40 53" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M 60 40 Q 70 28 80 38 T 72 56" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <circle cx="72" cy="68" r="4" fill="currentColor" />
      </svg>
    </div>
  );
}
