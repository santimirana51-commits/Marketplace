import { requireAdmin } from '@/lib/auth';
import { errResponse } from '@/lib/validation';
import { parseAIJson } from '@/lib/ai-json';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const configuredGeminiModel = process.env.GEMINI_MODEL?.trim();
const retiredGeminiModels = new Set(['gemini-1.5-flash', 'gemini-2.5-flash']);
const GEMINI_MODEL = !configuredGeminiModel || retiredGeminiModels.has(configuredGeminiModel)
  ? 'gemini-3-flash-preview'
  : configuredGeminiModel;
const OLLAMA_VISION_URL = process.env.OLLAMA_VISION_URL;
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llava:7b';

const SYSTEM_PROMPT = `You are an AI assistant for an e-commerce admin panel. 
Analyze the provided text and/or image description to extract product information.
Return a JSON object with the following fields (only include fields you can confidently extract):
- title: string (product name)
- short_description: string (brief summary, max 200 chars)
- description: string (full product description)
- price: number (in IDR, without currency symbol)
- currency: string (default "IDR")
- category: string (product category)
- install_steps: string (installation steps, one per line)
- notice: string (important notes)
- suggested_thumbnail_url: string (if image provided, suggest a placeholder or describe ideal thumbnail)
- tags: string[] (relevant tags/keywords)

Only return valid JSON. Do not include any explanation or markdown.`;

async function analyzeWithOllamaVision(text: string, imageBase64: string): Promise<Record<string, unknown> | null> {
  if (!OLLAMA_VISION_URL) return null;
  
  try {
    const prompt = `${SYSTEM_PROMPT}\n\nUser input:\n${text || 'Analyze this product image and extract all relevant product information.'}`;
    
    const res = await fetch(OLLAMA_VISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_VISION_MODEL,
        prompt,
        images: [imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')],
        format: 'json',
        stream: false,
        options: { temperature: 0.3 },
      }),
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    return parseAIJson(String(data.response ?? ''));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    return errResponse('Forbidden', (e as { status?: number }).status ?? 403);
  }

  const contentType = req.headers.get('content-type') ?? '';
  let textInput = '';
  let imageBase64: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    textInput = String(formData.get('text') ?? '');
    const imageData = formData.get('image');
    
    if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
      imageBase64 = imageData;
    } else if (imageData && typeof imageData === 'object' && 'arrayBuffer' in imageData) {
      const file = imageData as File;
      const buffer = Buffer.from(await file.arrayBuffer());
      imageBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;
    }
  } else {
    const body = await req.json().catch(() => ({}));
    textInput = String(body.text ?? '');
    imageBase64 = body.image ?? null;
  }

  if (!textInput && !imageBase64) {
    return errResponse('Text or image input required');
  }

  try {
    let parsed: Record<string, unknown> | null = null;
    let usedVision = false;

    if (imageBase64 && OLLAMA_VISION_URL) {
      const visionResult = await analyzeWithOllamaVision(textInput, imageBase64);
      if (visionResult) {
        parsed = visionResult;
        usedVision = true;
      }
    }

    if (!usedVision) {
      if (!genAI) {
        return errResponse('GEMINI_API_KEY not configured. Set it in .env.local or configure OLLAMA_VISION_URL for local vision model.', 500);
      }
      
      const model = genAI.getGenerativeModel({ 
        model: GEMINI_MODEL,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json',
        },
      });

      let prompt = SYSTEM_PROMPT;
      if (imageBase64) {
        prompt += `\n\nUser input: ${textInput || 'Analyze this product'} [Image provided but vision model not configured - analyzing text only]`;
      } else {
        prompt += `\n\nUser input: ${textInput}`;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const resultText = response.text();
      
      if (!resultText) return errResponse('AI returned empty response');

      parsed = parseAIJson(resultText);
      if (!parsed) {
        return errResponse('AI returned invalid JSON');
      }
    }

    if (!parsed) return errResponse('AI processing failed to produce result');
    return Response.json({ product: parsed, vision_used: usedVision });
  } catch (e) {
    console.error('AI error:', e);
    return errResponse(e instanceof Error ? e.message : 'AI processing failed', 500);
  }
}