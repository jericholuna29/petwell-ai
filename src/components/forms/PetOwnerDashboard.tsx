'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function PetOwnerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="pw-heading text-3xl mb-2">
          Welcome Back
        </h2>
        <p className="pw-subtext">Manage your pets and consultations</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#FFDBFD] to-[#C9BEFF]">
          <h3 className="text-sm font-medium pw-subtext">My Pets</h3>
          <p className="pw-stat-number mt-2">2</p>
          <p className="pw-subtext text-sm mt-1">Active pets</p>
        </Card>
        <Card className="bg-gradient-to-br from-[#C9BEFF] to-[#8494FF]/35">
          <h3 className="text-sm font-medium pw-subtext">Consultations</h3>
          <p className="pw-stat-number mt-2">5</p>
          <p className="pw-subtext text-sm mt-1">Total consultations</p>
        </Card>
        <Card className="bg-gradient-to-br from-[#FFDBFD] to-[#8494FF]/35">
          <h3 className="text-sm font-medium pw-subtext">Appointments</h3>
          <p className="pw-stat-number mt-2">1</p>
          <p className="pw-subtext text-sm mt-1">Upcoming</p>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <h3 className="text-xl font-bold text-[#191D3A] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/consultation">
            <Button variant="primary" className="w-full">
              New Consultation
            </Button>
          </Link>
          <Link href="/pets/add">
            <Button variant="secondary" className="w-full">
              My Pet
            </Button>
          </Link>
          <Link href="/appointments">
            <Button variant="secondary" className="w-full">
              View Appointments
            </Button>
          </Link>
        </div>
      </Card>

      {/* Recent Consultations */}
      <Card>
        <h3 className="text-xl font-bold text-[#191D3A] mb-4">Recent Consultations</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="border-b pb-4 last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[#191D3A]">Fluffy - Coughing</p>
                  <p className="text-sm pw-subtext">March 23, 2026</p>
                </div>
                <span className="px-3 py-1 bg-[#C9BEFF] text-[#24274A] rounded-full text-sm font-semibold">
                  Medium Risk
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

