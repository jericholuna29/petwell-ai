import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-white/85 backdrop-blur-sm rounded-2xl shadow-[0_12px_30px_rgba(99,103,255,0.12)] p-6 border border-[#C9BEFF]/70 transition-shadow duration-200 pw-interactive ${className}`}
    >
      {children}
    </div>
  );
}
