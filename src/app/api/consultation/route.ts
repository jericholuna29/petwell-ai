import { NextRequest, NextResponse } from 'next/server';
import { getAIPetHealthAnalysis } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { petType, petAge, symptoms } = await request.json();
    const normalizedPetType = typeof petType === 'string' ? petType.trim().toLowerCase() : '';
    const normalizedSymptoms = typeof symptoms === 'string' ? symptoms.trim() : '';
    const petAgeNumber = Number(petAge);
    const allowedPetTypes = new Set(['dog', 'cat']);

    if (
      !normalizedPetType ||
      !normalizedSymptoms ||
      Number.isNaN(petAgeNumber) ||
      petAgeNumber < 0
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!allowedPetTypes.has(normalizedPetType)) 
      {
      return NextResponse.json(
        { error: 'Only dog and cat consultations are supported right now.' },
        { status: 400 }
      );
    }

    const analysis = await getAIPetHealthAnalysis(
      normalizedPetType,
      petAgeNumber,
      normalizedSymptoms
    );

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Consultation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze pet health' },
      { status: 500 }
    );
  }
}
