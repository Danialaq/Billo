// Vercel serverless function: reads a bill with Gemini.
// The API key lives only in the server environment (GEMINI_API_KEY), never in the page.

const TYPES = ['utility', 'phone', 'rent', 'subscription', 'medical', 'fine', 'other'];
const MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BASE64 = 6_000_000;

export const PROMPT = `You read one U.S. bill, statement, renewal notice or ticket.
Return ONLY JSON with these keys:
{"payee": string, "type": one of ${JSON.stringify(TYPES)}, "amount": number (the total amount due now, no $),
 "dueDate": "YYYY-MM-DD" or null, "lateFee": number or null (only if printed), "accountNumber": string or null,
 "autopay": boolean (true only if the bill says autopay is on), "confidence": number 0-1, "summary": string (one plain sentence a stressed person can understand)}
If a value is not printed, use null. Never guess an amount or a date. If the image is not a bill, set confidence to 0.`;

export async function readWithGemini({ mimeType, data }, apiKey, { timeoutMs = 12000 } = {}) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data } }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };
  let lastStatus = 502;
  for (const model of MODELS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        lastStatus = res.status;
        if ([404, 429, 500, 502, 503, 504].includes(res.status)) continue;
        return { status: res.status === 400 ? 422 : 502, error: 'The AI could not read this file' };
      }
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { status: 422, error: 'The AI could not read this bill' };
      return { status: 200, result: JSON.parse(match[0]), model };
    } catch {
      lastStatus = 504;
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: lastStatus === 429 ? 429 : 503, error: 'AI is busy right now' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI reading is not configured' });
    return;
  }
  const { mimeType, data } = req.body || {};
  if (!ALLOWED_MIME.includes(mimeType) || typeof data !== 'string' || !data || data.length > MAX_BASE64) {
    res.status(400).json({ error: 'Send a JPG, PNG, WebP or PDF under 4 MB' });
    return;
  }
  const out = await readWithGemini({ mimeType, data }, apiKey);
  if (out.status !== 200) {
    res.status(out.status).json({ error: out.error });
    return;
  }
  res.status(200).json(out.result);
}
