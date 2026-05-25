// @supabase-auth-disabled
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface ConsultationRequest {
  petType: string;
  petAge: number;
  symptoms: string;
}

interface AIResponse {
  possible_illnesses: string[];
  tips: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

function parseAIResponse(raw: string): AIResponse {
  const normalized = raw.trim();

  // Handle accidental markdown-wrapped JSON
  const jsonText = normalized.startsWith('```')
    ? normalized.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : normalized;

  const parsed = JSON.parse(jsonText);

  if (
    !parsed ||
    !Array.isArray(parsed.possible_illnesses) ||
    !Array.isArray(parsed.tips) ||
    !Array.isArray(parsed.recommendations) ||
    !['low', 'medium', 'high'].includes(parsed.severity)
  ) {
    throw new Error('AI returned an invalid response format.');
  }

  return parsed as AIResponse;
}

async function getAIPetHealthAnalysis(
  petType: string,
  petAge: number,
  symptoms: string
): Promise<AIResponse> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a veterinary assistant. Return strictly valid JSON with keys: possible_illnesses, tips, recommendations, severity. Severity must be one of low, medium, high.',
        },
        {
          role: 'user',
          content: `Analyze the following pet health concern and provide guidance.

Pet Type: ${petType}
Pet Age: ${petAge} years
Symptoms: ${symptoms}

Please provide a JSON response with the following structure:
{
  "possible_illnesses": ["illness1", "illness2", ...],
  "tips": ["tip1", "tip2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "severity": "low|medium|high"
}

IMPORTANT: Respond ONLY with valid JSON, no additional text.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  return parseAIResponse(content);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { petType, petAge, symptoms }: ConsultationRequest = await req.json();

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
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!allowedPetTypes.has(normalizedPetType)) {
      return new Response(
        JSON.stringify({
          error: 'Only dog and cat consultations are supported right now.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const analysis = await getAIPetHealthAnalysis(
      normalizedPetType,
      petAgeNumber,
      normalizedSymptoms
    );

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze pet health';
    console.error('Consultation function error:', error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
