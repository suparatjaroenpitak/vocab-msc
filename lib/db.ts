import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const databasePath = path.resolve(process.env.DATABASE_PATH || path.join(process.cwd(), "data", "vocab.db"));
const globalForDb = globalThis as unknown as { lexiflowDb?: Database.Database };

function createDatabase() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      term TEXT NOT NULL,
      part_of_speech TEXT NOT NULL DEFAULT '',
      definition TEXT NOT NULL,
      example TEXT,
      interval_days REAL NOT NULL DEFAULT 0,
      due_at TEXT NOT NULL,
      review_count INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_email, term)
    );
    CREATE INDEX IF NOT EXISTS words_due_idx ON words(user_email, due_at);
  `);

  const demoCount = db.prepare("SELECT COUNT(*) as count FROM words WHERE user_email = ?").get("demo@local") as { count: number };
  if (demoCount.count === 0) {
    const now = new Date().toISOString();
    const seed = [
      ["airborne", "adj.", "ทางอากาศ, ทหารพลร่ม"],
      ["scattered", "adj.", "กระจัดกระจาย"],
      ["objective", "n.", "เป้าหมาย, ภารกิจ"],
      ["conviction", "n.", "ความเชื่อมั่น"],
      ["spread out", "phr.v.", "กระจายกำลัง, แยกออกจากกัน"],
      ["fortified", "adj.", "มีการเสริมแนวป้องกัน"],
      ["probe", "v.", "สำรวจหรือหยั่งเชิง"],
      ["cover", "n./v.", "ที่กำบัง, คุ้มกัน"]
    ];
    const insert = db.prepare(`
      INSERT INTO words (user_email, term, part_of_speech, definition, due_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const addSeed = db.transaction(() => {
      for (const [term, partOfSpeech, definition] of seed) {
        insert.run("demo@local", term, partOfSpeech, definition, now, now, now);
      }
    });
    addSeed();
  }

  return db;
}

export function getDb() {
  if (!globalForDb.lexiflowDb) globalForDb.lexiflowDb = createDatabase();
  return globalForDb.lexiflowDb;
}
