export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface Citation {
  fileName: string;
  page: number | null;
  chunkId: string;
}

export interface UploadedNote {
  id: string;
  fileName: string;
  mimeType: string;
  content: string;
  summary: string;
  uploadedAt: string;
  pageCount: number | null;
  byteSize: number;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  accent: string;
  description: string;
  files: UploadedNote[];
  createdAt: string;
  lastUpdatedAt: string;
}

export interface StudySessionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
}

export type ResearchSourceType = "academic" | "news" | "reference" | "organization" | "general";

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  sourceType: ResearchSourceType;
  credibility: number;
  publishedAt?: string | null;
}

export interface ResearchWorkflow {
  searchQuery: string;
  sourcesAnalyzed: number;
  warnings: string[];
  usedSessionMemory: boolean;
  modelUsed: string | null;
  stages: string[];
}

export interface ResearchReport {
  title: string;
  abstract: string;
  keyFindings: string[];
  sources: ResearchSource[];
  conclusion: string;
  followUpQuestions: string[];
  generatedAt: string;
}

export interface ResearchHistoryEntry {
  sessionId: string;
  query: string;
  report: ResearchReport;
  workflow: ResearchWorkflow;
}

export interface DatabaseShape {
  users: User[];
  sessions: UserSession[];
  subjects: Subject[];
  researchHistory: Record<string, ResearchHistoryEntry[]>;
}
