'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, CheckCircleFill } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface ConsultationResult {
  petName: string;
  petType: string;
  symptoms: string;
  possible_illnesses: string[];
  tips: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

interface Vet {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  clinic_name?: string;
  specialization?: string;
}

export default function ConsultationResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [vets, setVets] = useState<Vet[]>([]);
  const [selectedVetId, setSelectedVetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVets, setLoadingVets] = useState(true);

  useEffect(() => {
    try {
      const resultData = searchParams.get('result');
      if (!resultData) {
        toast.error('No consultation results found');
        router.push('/consultation');
        return;
      }

      const parsed = JSON.parse(decodeURIComponent(resultData)) as ConsultationResult;
      setResult(parsed);
    } catch (error) {
      console.error('Error parsing results:', error);
      toast.error('Failed to load consultation results');
      router.push('/consultation');
    } finally {
      setLoading(false);
    }
  }, [searchParams, router]);

  // Fetch recommended vets
  useEffect(() => {
    const fetchVets = async () => {
      try {
        const { data, error } = await supabase
          .from('vet_details')
          .select(`
            vets:profiles(id, full_name, email, phone),
            clinic_name,
            specialization
          `)
          .limit(3);

        if (error) throw error;

        const formattedVets: Vet[] = (data || []).map((vet: any) => ({
          id: vet.vets?.id || '',
          full_name: vet.vets?.full_name || 'Unnamed Vet',
          email: vet.vets?.email || '',
          phone: vet.vets?.phone || 'N/A',
          clinic_name: vet.clinic_name || 'Clinic',
          specialization: vet.specialization || 'General Practice',
        }));

        setVets(formattedVets);
        if (formattedVets.length > 0) {
          setSelectedVetId(formattedVets[0].id);
        }
      } catch (error) {
        console.error('Error fetching vets:', error);
      } finally {
        setLoadingVets(false);
      }
    };

    fetchVets();
  }, []);

  const handleBookAppointment = async () => {
    if (!selectedVetId || !result) {
      toast.error('Please select a vet first');
      return;
    }

    try {
      // Store the selected vet in session/context for the booking page
      sessionStorage.setItem(
        'appointmentPrefill',
        JSON.stringify({
          vetId: selectedVetId,
          vetName: vets.find(v => v.id === selectedVetId)?.full_name,
          symptoms: result.symptoms,
          petName: result.petName,
          severity: result.severity,
        })
      );

      router.push('/appointments');
    } catch (error) {
      console.error('Error preparing appointment:', error);
      toast.error('Failed to prepare appointment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[#32375D]">Loading results...</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const severityColors = {
    low: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800' },
    high: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
  };

  const severity = result.severity || 'medium';
  const colors = severityColors[severity];

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header with back button */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#C9BEFF]/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#F5F3FF] transition-colors text-[#6367FF]"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[#191D3A]">Consultation Results</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Pet Information Card */}
        <Card className={`${colors.bg} border-2 ${colors.border}`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-3xl font-bold text-[#191D3A] mb-2">
                {result.petName}
              </h2>
              <p className="text-lg text-[#32375D] capitalize">
                Type: {result.petType}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap ${colors.badge}`}>
              {severity.charAt(0).toUpperCase() + severity.slice(1)} Risk
            </span>
          </div>
          <div className="text-[#32375D] text-sm border-t border-current border-opacity-20 pt-3 mt-3">
            <p className="font-semibold mb-1">Reported Symptoms:</p>
            <p className="text-base">{result.symptoms}</p>
          </div>
        </Card>

        {/* AI Analysis Results */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Possible Illnesses */}
          <Card className="bg-white border border-[#C9BEFF]/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-[#6367FF] to-[#8494FF] rounded-full" />
              <h3 className="text-xl font-bold text-[#191D3A]">Possible Conditions</h3>
            </div>
            <div className="space-y-3">
              {result.possible_illnesses.length > 0 ? (
                result.possible_illnesses.map((illness, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-[#F5F3FF]/50 rounded-lg border border-[#C9BEFF]/30"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#6367FF] mt-1.5 flex-shrink-0" />
                    <p className="text-[#24274A] text-sm">{illness}</p>
                  </div>
                ))
              ) : (
                <p className="text-[#32375D]/60 italic">No conditions identified</p>
              )}
            </div>
          </Card>

          {/* Care Tips */}
          <Card className="bg-white border border-[#C9BEFF]/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-[#8494FF] to-[#A8B5FF] rounded-full" />
              <h3 className="text-xl font-bold text-[#191D3A]">Care Tips</h3>
            </div>
            <div className="space-y-3">
              {result.tips.length > 0 ? (
                result.tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-[#F5F3FF]/50 rounded-lg border border-[#C9BEFF]/30"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#8494FF] mt-1.5 flex-shrink-0" />
                    <p className="text-[#24274A] text-sm">{tip}</p>
                  </div>
                ))
              ) : (
                <p className="text-[#32375D]/60 italic">No tips available</p>
              )}
            </div>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="bg-gradient-to-br from-[#FFDBFD]/30 to-[#C9BEFF]/30 border border-[#C9BEFF]/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-gradient-to-b from-[#A8B5FF] to-[#C9BEFF] rounded-full" />
            <h3 className="text-xl font-bold text-[#191D3A]">Recommendations</h3>
          </div>
          <div className="space-y-3">
            {result.recommendations.length > 0 ? (
              result.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-4 bg-white/60 rounded-lg border border-[#C9BEFF]/30 hover:border-[#C9BEFF]/60 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#6367FF] to-[#8494FF] flex items-center justify-center text-white font-semibold text-sm">
                    {idx + 1}
                  </div>
                  <p className="text-[#24274A] text-sm pt-1">{rec}</p>
                </div>
              ))
            ) : (
              <p className="text-[#32375D]/60 italic">No recommendations available</p>
            )}
          </div>
        </Card>

        {/* Vet Recommendations */}
        {!loadingVets && vets.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
              <h3 className="text-xl font-bold text-[#191D3A]">Recommended Vets</h3>
              <span className="ml-auto text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                Select one to book
              </span>
            </div>
            <div className="grid gap-3">
              {vets.map((vet) => (
                <button
                  key={vet.id}
                  onClick={() => setSelectedVetId(vet.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedVetId === vet.id
                      ? 'border-blue-500 bg-white shadow-md'
                      : 'border-blue-200 bg-white/70 hover:bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-[#191D3A]">{vet.full_name}</h4>
                        {selectedVetId === vet.id && (
                          <CheckCircleFill size={18} className="text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-[#32375D] mb-2">
                        <span className="font-semibold">{vet.clinic_name}</span>
                        {vet.specialization && ` • ${vet.specialization}`}
                      </p>
                      <div className="flex flex-col gap-1 text-xs text-[#32375D]">
                        <p>📧 {vet.email}</p>
                        {vet.phone && <p>📞 {vet.phone}</p>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <Link href="/consultation">
            <Button variant="secondary" className="w-full">
              New Consultation
            </Button>
          </Link>
          <Button
            variant="primary"
            className="w-full"
            onClick={handleBookAppointment}
            disabled={!selectedVetId}
          >
            Book with {selectedVetId ? vets.find(v => v.id === selectedVetId)?.full_name : 'Selected Vet'}
          </Button>
        </div>
      </div>
    </div>
  );
}
