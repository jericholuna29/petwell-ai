# PetWell AI API Configuration Analysis

## Summary
This document details how the PetWell AI consultation API is configured and called, addressing the Android HTML-instead-of-JSON issue.

---

## 1. API Key Configuration

### Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://mlspkfwdrzvptwasjkpd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=<redacted>
```

### OpenAI API Key Handling (src/lib/openai.ts)
```typescript
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OpenAI API key. Set OPENAI_API_KEY on the server.');
  }

  return new OpenAI({ apiKey });
}
```

**Key Points:**
- Attempts to load `OPENAI_API_KEY` (server-side, private)
- Falls back to `NEXT_PUBLIC_OPENAI_API_KEY` (client-side, public)
- Currently only `OPENAI_API_KEY` is set in .env.local
- API key is used on the server side (Route Handler)

---

## 2. Consultation API Route/Endpoint

**Location:** `src/app/api/consultation/route.ts`

**Endpoint URL:** `POST /api/consultation`

```typescript
export async function POST(request: NextRequest) {
  try {
    const { getAIPetHealthAnalysis } = await import('@/lib/openai');
    const { petType, petAge, symptoms } = await request.json();
    
    // Input validation
    const normalizedPetType = typeof petType === 'string' ? petType.trim().toLowerCase() : '';
    const normalizedSymptoms = typeof symptoms === 'string' ? symptoms.trim() : '';
    const petAgeNumber = Number(petAge);
    const allowedPetTypes = new Set(['dog', 'cat']);

    // Validation checks
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

    if (!allowedPetTypes.has(normalizedPetType)) {
      return NextResponse.json(
        { error: 'Only dog and cat consultations are supported right now.' },
        { status: 400 }
      );
    }

    // Call OpenAI API
    const analysis = await getAIPetHealthAnalysis(
      normalizedPetType,
      petAgeNumber,
      normalizedSymptoms
    );

    // Return JSON response
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Consultation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze pet health' },
      { status: 500 }
    );
  }
}
```

**Request Body Schema:**
```json
{
  "petType": "dog" | "cat",
  "petAge": number,
  "symptoms": "string describing symptoms"
}
```

**Success Response (200):**
```json
{
  "possible_illnesses": ["illness1", "illness2"],
  "tips": ["tip1", "tip2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "severity": "low" | "medium" | "high"
}
```

---

## 3. Fetch Call & Headers (ConsultationForm.tsx)

**Location:** `src/components/forms/ConsultationForm.tsx`, in `handleSubmit` function

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  setLoading(true);
  try {
    const normalizedSymptoms = symptoms.trim();
    const parsedPetAge = Number(petAge);

    // Fetch call to API
    const response = await fetch('/api/consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petType,
        petAge: parsedPetAge,
        symptoms: normalizedSymptoms,
      }),
    });

    // Error handling
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Consultation failed (${response.status})`);
    }

    // Parse response
    const data = await response.json();

    // Create history entry
    const nextHistory: ConsultationHistoryEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      petName: petName.trim(),
      petType,
      petAge: parsedPetAge,
      symptoms: normalizedSymptoms,
      result: data,
    };

    // Persist to database
    await persistHistory(nextHistory);

    // Redirect to results
    const resultData = {
      petName: petName.trim(),
      petType,
      symptoms: normalizedSymptoms,
      possible_illnesses: data.possible_illnesses,
      tips: data.tips,
      recommendations: data.recommendations,
      severity: data.severity,
    };

    const resultsUrl = `/consultation/results?result=${encodeURIComponent(
      JSON.stringify(resultData)
    )}`;
    router.push(resultsUrl);
    toast.success('Consultation analysis complete!');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get consultation';
    toast.error(message);
  } finally {
    setLoading(false);
  }
};
```

### Headers Set:
```
POST /api/consultation
Content-Type: application/json
```

**Note:** Only `Content-Type` header is explicitly set. No custom headers or auth tokens are added.

---

## 4. OpenAI API Call (src/lib/openai.ts)

```typescript
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
```

**OpenAI SDK Used:** `openai` v6.32.0 (from package.json)

---

## 5. Error Handling

The API has multiple layers of error handling:

1. **Input Validation Errors** (400)
   - Missing required fields
   - Invalid pet type
   - Invalid age value

2. **Server Errors** (500)
   - Caught in try/catch block
   - Returns error message from exception

3. **Client-side Error Handling** (ConsultationForm.tsx)
   - Checks `response.ok` before parsing JSON
   - Falls back to status code if error data parse fails
   - Shows toast notifications to user

---

## 6. Capacitor & Android Configuration

### Next.js Config (next.config.ts)
```typescript
const nextConfig: NextConfig = {
  output: "export",
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
};
```

**Key Setting:** `output: "export"` - Generates static HTML export for Capacitor

### Capacitor Config (capacitor.config.json)
```json
{
  "appId": "com.petwell.ai",
  "appName": "PetWell AI",
  "webDir": "out"
}
```

**Key Setting:** `webDir: "out"` - Serves statically exported app from `out/` directory

### Android Manifest (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

**Note:** INTERNET permission is declared

### Android Build Config (android/app/build.gradle)
- No custom network configuration
- No proxy settings
- Standard Capacitor Android setup

---

## 7. Request Flow Diagram

```
ConsultationForm.tsx
     ↓
fetch('/api/consultation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ petType, petAge, symptoms })
})
     ↓
Next.js Route Handler (/api/consultation/route.ts)
     ↓
getAIPetHealthAnalysis() in src/lib/openai.ts
     ↓
OpenAI SDK calls OpenAI API
  - Authorization: Bearer {OPENAI_API_KEY}
  - Content-Type: application/json
  - Model: gpt-4o-mini
     ↓
OpenAI returns JSON completion
     ↓
parseAIResponse() validates JSON structure
     ↓
NextResponse.json(analysis) returns to client
     ↓
ConsultationForm parses response.json()
     ↓
Data saved to Supabase ai_consultations table
     ↓
Redirect to /consultation/results
```

---

## 8. Potential Issues with Android

### Why Android Might Get HTML Instead of JSON:

1. **Static Build Output**
   - Next.js is configured with `output: "export"` (static export mode)
   - This means NO server-side rendering for API routes
   - Route handlers require a Node.js server to function
   - **CRITICAL**: When built for Capacitor, the API route (`/api/consultation`) won't exist!

2. **Missing Server Infrastructure**
   - The `out/` directory only contains static HTML files
   - No backend server to handle dynamic requests
   - Requests to `/api/consultation` fall back to 404, which may return an HTML error page

3. **Capacitor Webview**
   - Loading from `file://` protocol instead of `http://`
   - May have different behavior for missing routes

### Solution Approach:
For the Android app to work with the consultation API, you need either:

**Option A: Backend Server**
- Deploy a Node.js server to handle `/api/consultation` requests
- Update Capacitor config to point to server URL
- Use absolute URLs in fetch calls: `https://api.petwell.ai/api/consultation`

**Option B: Client-side Processing**
- Move OpenAI API calls to client-side
- Initialize OpenAI SDK in browser
- Remove server-side route handler
- Change `next.config.ts` to not use static export mode

---

## 9. Dependencies Summary

From package.json:
```json
{
  "openai": "^6.32.0",        // For OpenAI API calls
  "axios": "^1.13.6",          // HTTP client (unused in consultation)
  "@supabase/supabase-js": "^2.99.3",  // Database
  "next": "16.2.1",
  "react": "19.2.4"
}
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/openai.ts` | OpenAI client initialization and API calls |
| `src/app/api/consultation/route.ts` | Next.js API route handler |
| `src/components/forms/ConsultationForm.tsx` | React component handling form and fetch |
| `.env.local` | Environment variables (OPENAI_API_KEY, Supabase keys) |
| `next.config.ts` | Next.js static export configuration |
| `capacitor.config.json` | Capacitor app configuration |
| `package.json` | Dependencies and scripts |

