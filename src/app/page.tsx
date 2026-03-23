'use client';

import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#FFDBFD] via-[#C9BEFF]/75 to-[#8494FF]/45 text-[#24274A]">
      <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[#FFDBFD]/85 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#8494FF]/30 blur-3xl" />

      <header className="relative mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <Image
              src="/Petwellai.svg"
              alt="Petwell AI logo"
              width={64}
              height={64}
              className="h-14 w-14 md:h-16 md:w-16"
              priority
            />
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#6367FF] to-[#8494FF]">
              Petwell AI
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="secondary" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="secondary" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="primary" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-12 md:px-8 md:pb-20">
        <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-stretch">
          <Card className="p-6 md:p-10 bg-gradient-to-br from-white/88 to-[#FFDBFD]/72 border-[#C9BEFF]">
            <p className="pw-chip mb-4 uppercase tracking-[0.18em]">
              Intelligent Veterinary Assistance
            </p>
            <h2 className="pw-heading max-w-2xl text-3xl font-black leading-tight sm:text-4xl md:text-6xl">
              Professional Pet Health Support,
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8494FF] to-[#6367FF]"> Designed for Daily Care</span>
            </h2>
            <p className="pw-subtext mt-5 max-w-2xl text-base md:text-lg">
              Petwell AI helps pet owners and veterinary teams with accurate triage summaries,
              faster appointment coordination, and clear consultation records in one modern workspace.
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link href="/consultation">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">Start Consultation</Button>
              </Link>
              <Link href="/appointments">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">Book Appointment</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-7 md:p-8 bg-gradient-to-br from-[#C9BEFF]/65 to-white/85 border-[#8494FF]/40">
            <h3 className="pw-heading text-xl">At a Glance</h3>
            <div className="mt-5 space-y-4">
              {[
                {
                  title: 'AI Symptom Analysis',
                  text: 'Receive structured insights with severity guidance in seconds.',
                },
                {
                  title: 'Owner and Vet Dashboards',
                  text: 'Role-based workflows keep records, appointments, and updates organized.',
                },
                {
                  title: 'My Pet Management',
                  text: 'Maintain complete profiles for every pet with editable details.',
                },
              ].map((item) => (
                <div key={item.title} className="pw-section-card">
                  <p className="pw-heading font-semibold">{item.title}</p>
                  <p className="pw-subtext mt-1 text-sm">{item.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { metric: '24/7', label: 'Access to digital triage support' },
            { metric: '2 Roles', label: 'Purpose-built owner and vet interfaces' },
            { metric: 'Fast', label: 'Clear flow from symptom to booking' },
          ].map((item) => (
            <Card key={item.metric} className="bg-gradient-to-r from-[#FFDBFD]/80 to-white/75 p-5">
              <p className="pw-stat-number text-2xl">{item.metric}</p>
              <p className="pw-subtext mt-1 text-sm">{item.label}</p>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
