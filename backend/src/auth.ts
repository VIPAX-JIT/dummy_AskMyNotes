import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { readDb, writeDb } from "./store.js";
import type { User, UserSession } from "./types.js";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function buildSession(userId: string): UserSession {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  return {
    id: randomUUID(),
    userId,
    token: randomUUID(),
    createdAt,
    expiresAt
  };
}

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

function readBearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return req.header("x-session-token") ?? null;
}

export function registerUser(req: Request, res: Response): void {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration payload" });
    return;
  }

  const db = readDb();
  const existing = db.users.find((user) => user.email.toLowerCase() === parsed.data.email.toLowerCase());
  if (existing) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const user: User = {
    id: randomUUID(),
    name: parsed.data.name.trim(),
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    createdAt: new Date().toISOString()
  };

  const session = buildSession(user.id);
  db.users.push(user);
  db.sessions.push(session);
  writeDb(db);

  res.status(201).json({
    user: publicUser(user),
    session: {
      token: session.token,
      expiresAt: session.expiresAt
    }
  });
}

export function loginUser(req: Request, res: Response): void {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login payload" });
    return;
  }

  const db = readDb();
  const user = db.users.find(
    (entry) =>
      entry.email.toLowerCase() === parsed.data.email.toLowerCase() &&
      entry.password === parsed.data.password
  );

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const session = buildSession(user.id);
  db.sessions = db.sessions.filter((entry) => entry.userId !== user.id || new Date(entry.expiresAt).getTime() > Date.now());
  db.sessions.push(session);
  writeDb(db);

  res.status(200).json({
    user: publicUser(user),
    session: {
      token: session.token,
      expiresAt: session.expiresAt
    }
  });
}

export function getAuthenticatedUser(req: Request): User | null {
  const token = readBearerToken(req);
  if (!token) {
    return null;
  }

  const db = readDb();
  const session = db.sessions.find((entry) => entry.token === token && new Date(entry.expiresAt).getTime() > Date.now());
  if (!session) {
    return null;
  }

  return db.users.find((user) => user.id === session.userId) ?? null;
}

export function getCurrentUser(req: Request, res: Response): void {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.status(200).json({ user: publicUser(user) });
}

export function logoutUser(req: Request, res: Response): void {
  const token = readBearerToken(req);
  if (!token) {
    res.status(204).end();
    return;
  }

  const db = readDb();
  db.sessions = db.sessions.filter((entry) => entry.token !== token);
  writeDb(db);
  res.status(204).end();
}
