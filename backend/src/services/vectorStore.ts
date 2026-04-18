interface ChunkVectorMetadata {
  subjectId: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  chunkText: string;
}

interface PineconeMatch {
  id: string;
  score?: number;
  metadata?: ChunkVectorMetadata;
}

const pineconeApiKey = process.env.PINECONE_API_KEY || "";
const pineconeIndexHost = process.env.PINECONE_INDEX_HOST || "";
const apiVersion = "2025-10";

function pineconeHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    "Api-Key": pineconeApiKey,
    "X-Pinecone-Api-Version": apiVersion
  };
}

export function isVectorStoreConfigured(): boolean {
  return Boolean(pineconeApiKey && pineconeIndexHost);
}

export async function upsertSubjectChunks(params: {
  namespace: string;
  vectors: Array<{
    id: string;
    values: number[];
    metadata: ChunkVectorMetadata;
  }>;
}): Promise<void> {
  if (!isVectorStoreConfigured() || params.vectors.length === 0) {
    return;
  }

  const response = await fetch(`https://${pineconeIndexHost}/vectors/upsert`, {
    method: "POST",
    headers: pineconeHeaders(),
    body: JSON.stringify({
      namespace: params.namespace,
      vectors: params.vectors
    })
  });

  if (!response.ok) {
    throw new Error(`Pinecone upsert failed with ${response.status}`);
  }
}

export async function querySubjectChunks(params: {
  namespace: string;
  vector: number[];
  topK?: number;
}): Promise<Array<{ score: number; metadata: ChunkVectorMetadata }>> {
  if (!isVectorStoreConfigured()) {
    return [];
  }

  const response = await fetch(`https://${pineconeIndexHost}/query`, {
    method: "POST",
    headers: pineconeHeaders(),
    body: JSON.stringify({
      namespace: params.namespace,
      vector: params.vector,
      topK: params.topK ?? 5,
      includeMetadata: true,
      includeValues: false
    })
  });

  if (!response.ok) {
    throw new Error(`Pinecone query failed with ${response.status}`);
  }

  const payload = await response.json() as { matches?: PineconeMatch[] };
  return (payload.matches ?? [])
    .filter((match): match is PineconeMatch & { metadata: ChunkVectorMetadata } => Boolean(match.metadata))
    .map((match) => ({
      score: match.score ?? 0,
      metadata: match.metadata
    }));
}
