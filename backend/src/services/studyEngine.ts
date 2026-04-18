import type { Citation, Subject } from "../types.js";
import { embedText } from "./embeddings.js";
import { generateJson, getGeminiModelName } from "./gemini.js";
import { isVectorStoreConfigured, querySubjectChunks, upsertSubjectChunks } from "./vectorStore.js";

function sliceContext(subject: Subject): string {
  return subject.files
    .slice(-3)
    .map((file) => {
      return [
        `File: ${file.fileName}`,
        `Summary: ${file.summary}`,
        `Content excerpt: ${file.content.slice(0, 3000)}`
      ].join("\n");
    })
    .join("\n\n");
}

export function chunkNoteContent(content: string, size = 900, overlap = 180): string[] {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + size);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) {
      break;
    }
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export async function indexNoteForRetrieval(params: {
  subjectId: string;
  fileId: string;
  fileName: string;
  content: string;
}): Promise<void> {
  if (!isVectorStoreConfigured()) {
    return;
  }

  const chunks = chunkNoteContent(params.content);
  const vectors: Array<{
    id: string;
    values: number[];
    metadata: {
      subjectId: string;
      fileId: string;
      fileName: string;
      chunkIndex: number;
      chunkText: string;
    };
  }> = [];

  for (const [index, chunk] of chunks.entries()) {
    try {
      const embedding = await embedText(chunk, "RETRIEVAL_DOCUMENT");
      if (!embedding) {
        continue;
      }

      vectors.push({
        id: `${params.fileId}-chunk-${index + 1}`,
        values: embedding,
        metadata: {
          subjectId: params.subjectId,
          fileId: params.fileId,
          fileName: params.fileName,
          chunkIndex: index + 1,
          chunkText: chunk
        }
      });
    } catch {
      // Skip a failed chunk rather than blocking the whole upload.
    }
  }

  await upsertSubjectChunks({
    namespace: params.subjectId,
    vectors
  });
}

async function retrieveSemanticContext(subject: Subject, question: string): Promise<{
  context: string;
  citations: Citation[];
  confidence: "High" | "Medium" | "Low";
}> {
  if (!isVectorStoreConfigured()) {
    return {
      context: sliceContext(subject),
      citations: subject.files.slice(0, 2).map((file, index) => ({
        fileName: file.fileName,
        page: file.pageCount ? Math.min(file.pageCount, 1) : 1,
        chunkId: `${file.id}-chunk-${index + 1}`
      })),
      confidence: subject.files.length > 0 ? "Medium" : "Low"
    };
  }

  try {
    const embedding = await embedText(question, "RETRIEVAL_QUERY");
    if (!embedding) {
      throw new Error("Missing query embedding.");
    }

    const matches = await querySubjectChunks({
      namespace: subject.id,
      vector: embedding,
      topK: 4
    });

    if (matches.length === 0) {
      return {
        context: sliceContext(subject),
        citations: subject.files.slice(0, 2).map((file, index) => ({
          fileName: file.fileName,
          page: file.pageCount ? Math.min(file.pageCount, 1) : 1,
          chunkId: `${file.id}-chunk-${index + 1}`
        })),
        confidence: "Medium"
      };
    }

    return {
      context: matches.map((match) => match.metadata.chunkText).join("\n\n"),
      citations: matches.map((match) => ({
        fileName: match.metadata.fileName,
        page: 1,
        chunkId: `${match.metadata.fileId}-chunk-${match.metadata.chunkIndex}`
      })),
      confidence: matches[0]?.score && matches[0].score > 0.8 ? "High" : "Medium"
    };
  } catch {
    return {
      context: sliceContext(subject),
      citations: subject.files.slice(0, 2).map((file, index) => ({
        fileName: file.fileName,
        page: file.pageCount ? Math.min(file.pageCount, 1) : 1,
        chunkId: `${file.id}-chunk-${index + 1}`
      })),
      confidence: "Medium"
    };
  }
}

function buildFallbackAnswer(subject: Subject, question: string): {
  answer: string;
  citations: Citation[];
  confidence: "High" | "Medium" | "Low";
  evidence: string[];
} {
  const excerpt = subject.files.map((file) => file.content).join("\n\n").slice(0, 520);
  return {
    answer: excerpt
      ? `(AI Fallback) We couldn't reach the Gemini API to synthesize a response, but based on your notes for ${subject.name}, here is the most relevant unformatted excerpt we found:\n\n"...${excerpt}..."`
      : `(AI Fallback) The Gemini API is currently unavailable, and no usable text could be extracted from your notes to answer "${question}".`,
    citations: subject.files.slice(0, 2).map((file, index) => ({
      fileName: file.fileName,
      page: file.pageCount ? Math.min(file.pageCount, 1) : 1,
      chunkId: `${file.id}-chunk-${index + 1}`
    })),
    confidence: subject.files.length > 0 ? "Medium" : "Low",
    evidence: excerpt ? [excerpt] : []
  };
}

function answerSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      answer: { type: "string" },
      confidence: { type: "string" },
      evidence: { type: "array", items: { type: "string" } }
    },
    required: ["answer", "confidence", "evidence"]
  };
}

function quizSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      mcqs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            correctIndex: { type: "number" },
            explanation: { type: "string" }
          },
          required: ["question", "options", "correctIndex", "explanation"]
        }
      },
      shortAnswers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            modelAnswer: { type: "string" }
          },
          required: ["question", "modelAnswer"]
        }
      }
    },
    required: ["mcqs", "shortAnswers"]
  };
}

export async function summarizeNote(fileName: string, content: string): Promise<string> {
  const modelUsed = getGeminiModelName();
  if (modelUsed) {
    try {
      const response = await generateJson<{ summary: string }>({
        systemInstruction: "You summarize notes for a student study assistant.",
        prompt: `Summarize the following note file in 3 concise sentences.\n\nFile name: ${fileName}\n\nContent:\n${content.slice(0, 10000)}`,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" }
          },
          required: ["summary"]
        },
        temperature: 0.3
      });

      if (response?.summary) {
        return response.summary;
      }
    } catch (error) {
      console.error("[StudyEngine] Summarization Gemini API error:", error instanceof Error ? error.message : error);
    }
  }

  return content.replace(/\s+/g, " ").trim().slice(0, 220) || "Uploaded note summary unavailable.";
}

export async function answerQuestion(
  subject: Subject,
  question: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{
  answer: string;
  citations: Citation[];
  confidence: "High" | "Medium" | "Low";
  evidence: string[];
  found: boolean;
}> {
  if (subject.files.length === 0) {
    return {
      answer: `No notes have been uploaded for ${subject.name} yet, so the assistant cannot answer the question reliably.`,
      citations: [],
      confidence: "Low",
      evidence: [],
      found: false
    };
  }

  const fallback = buildFallbackAnswer(subject, question);
  const retrieved = await retrieveSemanticContext(subject, question);
  const modelUsed = getGeminiModelName();

  if (modelUsed) {
    try {
      // Format history natively as text to make the prompt fully semantic
      const historyContext = history && history.length > 0
        ? `[Previous Conversation Context]\n${history.map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n\n")}\n\n`
        : "";

      const response = await generateJson<{
        answer: string;
        confidence: "High" | "Medium" | "Low";
        evidence: string[];
      }>({
        systemInstruction: "You are a grounded study copilot. Answer only from the uploaded note context and stay concise. If the user refers to the conversation history, use it strictly as context, but evidence must still come from the notes.",
        prompt: [
          `Subject: ${subject.name}`,
          historyContext.trim(),
          `[Current Request]\nQuestion: ${question}`,
          "Use only the context below:",
          retrieved.context
        ].filter(Boolean).join("\n\n"),
        schema: answerSchema(),
        temperature: 0.25
      });

      if (response) {
        return {
          answer: response.answer,
          citations: retrieved.citations,
          confidence: response.confidence || retrieved.confidence,
          evidence: response.evidence.slice(0, 3),
          found: true
        };
      }
    } catch (error) {
      console.error("[StudyEngine] Answer Generation Gemini API error:", error instanceof Error ? error.message : error);
    }
  }

  return {
    ...fallback,
    citations: retrieved.citations.length > 0 ? retrieved.citations : fallback.citations,
    confidence: retrieved.confidence,
    found: true
  };
}

export async function generateStudyQuiz(subject: Subject): Promise<{
  mcqs: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    citation: string;
  }>;
  shortAnswers: Array<{
    id: string;
    question: string;
    modelAnswer: string;
    citation: string;
  }>;
}> {
  const modelUsed = getGeminiModelName();
  const firstCitation = subject.files[0]?.fileName ?? "uploaded notes";

  if (modelUsed && subject.files.length > 0) {
    try {
      const response = await generateJson<{
        mcqs: Array<{
          question: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        }>;
        shortAnswers: Array<{
          question: string;
          modelAnswer: string;
        }>;
      }>({
        systemInstruction: "You generate short, classroom-friendly quizzes from notes.",
        prompt: [
          `Subject: ${subject.name}`,
          "Create 3 MCQs and 2 short-answer questions grounded in the notes below.",
          sliceContext(subject)
        ].join("\n\n"),
        schema: quizSchema(),
        temperature: 0.45
      });

      if (response) {
        return {
          mcqs: response.mcqs.slice(0, 3).map((item, index) => ({
            id: `mcq_${Date.now()}_${index}`,
            question: item.question,
            options: item.options.slice(0, 4),
            correctIndex: Math.min(Math.max(item.correctIndex, 0), 3),
            explanation: item.explanation,
            citation: firstCitation
          })),
          shortAnswers: response.shortAnswers.slice(0, 2).map((item, index) => ({
            id: `short_${Date.now()}_${index}`,
            question: item.question,
            modelAnswer: item.modelAnswer,
            citation: firstCitation
          }))
        };
      }
    } catch {
      // Fall back below.
    }
  }

  return {
    mcqs: [
      {
        id: `mcq_${Date.now()}_0`,
        question: `Which statement best captures the central theme of ${subject.name}?`,
        options: ["A surface-level definition", "A mix of concept, evidence, and application", "Only historical context", "Only formulas"],
        correctIndex: 1,
        explanation: `The uploaded notes for ${subject.name} are most useful when the learner combines concept understanding with evidence and application.`,
        citation: firstCitation
      },
      {
        id: `mcq_${Date.now()}_1`,
        question: `What should be the first revision step for ${subject.name}?`,
        options: ["Memorize everything", "Ignore examples", "Identify the core framework", "Skip difficult sections"],
        correctIndex: 2,
        explanation: "A solid revision process begins by identifying the main framework and then drilling into examples.",
        citation: firstCitation
      }
    ],
    shortAnswers: [
      {
        id: `short_${Date.now()}_0`,
        question: `Summarize one important concept from ${subject.name} in 4 lines.`,
        modelAnswer: "A strong answer should define the concept, explain why it matters, and connect it to one supporting example from the uploaded notes.",
        citation: firstCitation
      },
      {
        id: `short_${Date.now()}_1`,
        question: `Describe a real-world use or implication connected to your ${subject.name} notes.`,
        modelAnswer: "A good answer should relate the idea to an application, mention a limitation, and explain why the topic is useful in practice.",
        citation: firstCitation
      }
    ]
  };
}
