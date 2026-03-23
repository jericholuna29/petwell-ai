import React from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFDBFD] via-[#C9BEFF] to-[#8494FF]/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[#C9BEFF]/80 bg-white/86 p-6 shadow-[0_20px_60px_rgba(99,103,255,0.2)] backdrop-blur-sm md:p-8">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <Image
                src="/Petwellai.svg"
                alt="Petwell AI logo"
                width={64}
                height={64}
                className="h-16 w-16"
                priority
              />
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8494FF] to-[#6367FF]">
                Petwell AI
              </h1>
            </div>
            <p className="pw-subtext mt-2 text-sm">Professional Pet Care</p>
          </div>
          <h2 className="mb-6 text-center text-2xl font-bold text-[#191D3A]">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
