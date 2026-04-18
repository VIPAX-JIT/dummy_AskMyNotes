const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function endpointForModel(modelName: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
}

function extractText(payload: unknown): string {
  const data = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

export function isGeminiConfigured(): boolean {
  return Boolean(apiKey);
}

export function getGeminiModelName(): string | null {
  return isGeminiConfigured() ? model : null;
}

export async function generateJson<T>(options: {
  systemInstruction: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
}): Promise<T | null> {
  if (!apiKey) {
    return null;
  }

  const response = await fetch(endpointForModel(model), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: options.systemInstruction }]
      },
      contents: [
        {
          parts: [{ text: options.prompt }]
        }
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.4,
        responseMimeType: "application/json",
        responseSchema: options.schema
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const payload = await response.json();
  const text = extractText(payload);
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
