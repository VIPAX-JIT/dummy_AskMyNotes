import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { getAuthenticatedUser } from "./auth.js";
import { readDb, writeDb } from "./store.js";
import { answerQuestion, generateStudyQuiz, indexNoteForRetrieval, summarizeNote } from "./services/studyEngine.js";
import type { Subject, UploadedNote } from "./types.js";

const subjectPalette = ["#F4B8BF", "#B7D7F8", "#CDE7BE"];

const createSubjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(220).optional()
});

const uploadJsonSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().default("text/plain"),
  content: z.string().min(1)
});

const askSchema = z.object({
  subjectId: z.string().min(1),
  question: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
  })).optional()
});

interface UploadedFilePayload {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function findSubject(userId: string, subjectId: string): Subject | null {
  const db = readDb();
  return db.subjects.find((subject) => subject.userId === userId && subject.id === subjectId) ?? null;
}

async function parseUploadedFile(file: UploadedFilePayload): Promise<{
  content: string;
  pageCount: number | null;
}> {
  if (file.mimetype.includes("pdf")) {
    const module = await import("pdf-parse");
    const parsePdf = (module as { default?: (buffer: Buffer) => Promise<{ text?: string; numpages?: number }> }).default ?? (module as unknown as (buffer: Buffer) => Promise<{ text?: string; numpages?: number }>);
    const result = await parsePdf(file.buffer);
    return {
      content: result.text?.trim() ?? "",
      pageCount: result.numpages ?? null
    };
  }

  return {
    content: file.buffer.toString("utf8").trim(),
    pageCount: null
  };
}

export function listSubjects(req: Request, res: Response): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const db = readDb();
  const subjects = db.subjects
    .filter((subject) => subject.userId === user.id)
    .map((subject) => ({
      id: subject.id,
      name: subject.name,
      accent: subject.accent,
      description: subject.description,
      createdAt: subject.createdAt,
      fileCount: subject.files.length
    }));

  res.status(200).json({ subjects });
}

export function createSubject(req: Request, res: Response): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = createSubjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid subject payload" });
    return;
  }

  const db = readDb();
  const existingSubjects = db.subjects.filter((subject) => subject.userId === user.id);
  if (existingSubjects.length >= 3) {
    res.status(400).json({ error: "You can create up to 3 subjects in study mode." });
    return;
  }

  const subject: Subject = {
    id: randomUUID(),
    userId: user.id,
    name: parsed.data.name.trim(),
    description: parsed.data.description?.trim() ?? "Focused study space for uploaded notes and quizzes.",
    accent: subjectPalette[existingSubjects.length % subjectPalette.length] ?? "#B7D7F8",
    files: [],
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  };

  db.subjects.push(subject);
  writeDb(db);
  res.status(201).json({ subject });
}

export function listSubjectFiles(req: Request, res: Response): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const subject = findSubject(user.id, getRouteParam(req.params.subjectId));
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.status(200).json({
    files: subject.files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      summary: file.summary,
      chunkCount: Math.max(1, Math.ceil(file.content.length / 500)),
      pageCount: file.pageCount,
      byteSize: file.byteSize,
      lastIngestedAt: file.uploadedAt
    }))
  });
}

export async function uploadSubjectFile(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const db = readDb();
  const subjectId = getRouteParam(req.params.subjectId);
  const subject = db.subjects.find((entry) => entry.userId === user.id && entry.id === subjectId);
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  let fileName = "";
  let mimeType = "text/plain";
  let content = "";
  let pageCount: number | null = null;
  let byteSize = 0;

  const uploadedFile = (req as Request & { file?: UploadedFilePayload }).file;
  if (uploadedFile) {
    fileName = uploadedFile.originalname;
    mimeType = uploadedFile.mimetype || "application/octet-stream";
    byteSize = uploadedFile.size;

    const parsedFile = await parseUploadedFile(uploadedFile);
    content = parsedFile.content;
    pageCount = parsedFile.pageCount;
  } else {
    const parsed = uploadJsonSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid upload payload" });
      return;
    }
    fileName = parsed.data.fileName;
    mimeType = parsed.data.mimeType;
    content = parsed.data.content.trim();
    byteSize = Buffer.byteLength(content, "utf8");
  }

  if (!content) {
    res.status(400).json({ error: "No readable text could be extracted from the uploaded file." });
    return;
  }

  const note: UploadedNote = {
    id: randomUUID(),
    fileName,
    mimeType,
    content,
    summary: await summarizeNote(fileName, content),
    uploadedAt: new Date().toISOString(),
    pageCount,
    byteSize
  };

  subject.files.push(note);
  subject.lastUpdatedAt = new Date().toISOString();
  writeDb(db);

  void indexNoteForRetrieval({
    subjectId: subject.id,
    fileId: note.id,
    fileName: note.fileName,
    content: note.content
  }).catch(() => {
    // Keep uploads successful even if semantic indexing fails.
  });

  res.status(201).json({
    ingestion: {
      subjectId: subject.id,
      subjectName: subject.name,
      fileName: note.fileName,
      totalPages: note.pageCount,
      byteSize: note.byteSize,
      chunkCount: Math.max(1, Math.ceil(note.content.length / 500)),
      summary: note.summary
    }
  });
}

export async function askStudyQuestion(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid question payload" });
    return;
  }

  const subject = findSubject(user.id, parsed.data.subjectId);
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const result = await answerQuestion(subject, parsed.data.question, parsed.data.history);
  res.status(200).json(result);
}

export async function generateQuiz(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const subject = findSubject(user.id, getRouteParam(req.params.subjectId));
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const quiz = await generateStudyQuiz(subject);
  res.status(200).json({ quiz });
}
