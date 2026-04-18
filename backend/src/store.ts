import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DatabaseShape } from "./types.js";

const dataDir = join(process.cwd(), "data");
const dbFile = join(dataDir, "db.json");

const defaultDb: DatabaseShape = {
  users: [],
  sessions: [],
  subjects: [],
  researchHistory: {}
};

function ensureDb() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  if (!existsSync(dbFile)) {
    writeFileSync(dbFile, JSON.stringify(defaultDb, null, 2), "utf8");
  }
}

export function readDb(): DatabaseShape {
  ensureDb();
  const raw = JSON.parse(readFileSync(dbFile, "utf8")) as Partial<DatabaseShape>;
  return {
    users: raw.users ?? [],
    sessions: raw.sessions ?? [],
    subjects: raw.subjects ?? [],
    researchHistory: raw.researchHistory ?? {}
  };
}

export function writeDb(data: DatabaseShape): void {
  ensureDb();
  writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf8");
}
