const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

interface EmbedResponse {
  embedding?: {
    values?: number[];
  };
}

export function areEmbeddingsConfigured(): boolean {
  return Boolean(apiKey);
}

export async function embedText(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[] | null> {
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: {
        parts: [{ text }]
      },
      taskType
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed with ${response.status}`);
  }

  const payload = await response.json() as EmbedResponse;
  return payload.embedding?.values ?? null;
}
