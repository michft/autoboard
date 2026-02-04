import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database file in drizzle directory at project root
const dbDir = join(__dirname, "../../drizzle");
const dbPath = join(dbDir, "db.sqlite");

// Ensure the drizzle directory exists
try {
  mkdirSync(dbDir, { recursive: true });
} catch (error) {
  // Directory might already exist, ignore error
}

const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
