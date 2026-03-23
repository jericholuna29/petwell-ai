import { OpenAI } from 'openai';
import { AIResponse } from '@/types';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OpenAI API key. Set OPENAI_API_KEY on the server.');
  }

  return new OpenAI({ apiKey });
}

function parseAIResponse(raw: string): AIResponse {
  const normalized = raw.trim();

  // Handle accidental markdown-wrapped JSON.
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

export async function getAIPetHealthAnalysis(
  petType: string,
  petAge: number,
  symptoms: string
): Promise<AIResponse> {
  try {
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
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
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    return parseAIResponse(content);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}
