import type { Request, Response } from "express";
import { z } from "zod";
import { getAuthenticatedUser } from "./auth.js";
import { createResearchReport, createTopicExpansion } from "./services/researchEngine.js";
import { readDb, writeDb } from "./store.js";
import type { ResearchHistoryEntry } from "./types.js";

const researchSchema = z.object({
  query: z.string().min(5),
  sessionId: z.string().min(1).optional()
});

export async function generateResearchReport(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = researchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid research query" });
    return;
  }

  const db = readDb();
  const history = db.researchHistory[user.id] ?? [];
  const sessionId = parsed.data.sessionId ?? `research_${Date.now()}`;
  const { report, workflow } = await createResearchReport(parsed.data.query, history);

  const entry: ResearchHistoryEntry = {
    sessionId,
    query: parsed.data.query,
    report,
    workflow
  };

  db.researchHistory[user.id] = [entry, ...history].slice(0, 16);
  writeDb(db);

  res.status(200).json({
    sessionId,
    report,
    workflow
  });
}

export async function expandTopic(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = researchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid topic expansion request" });
    return;
  }

  const expansion = await createTopicExpansion(parsed.data.query);
  res.status(200).json({
    query: parsed.data.query,
    ...expansion
  });
}

export function getResearchHistory(req: Request, res: Response): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const db = readDb();
  const history = db.researchHistory[user.id] ?? [];
  res.status(200).json({
    history: history.map((entry) => ({
      query: entry.query,
      title: entry.report.title,
      abstract: entry.report.abstract,
      generatedAt: entry.report.generatedAt,
      sessionId: entry.sessionId,
      sourceCount: entry.report.sources.length,
      warnings: entry.workflow.warnings
    }))
  });
}
