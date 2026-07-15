import fs from "node:fs";
import path from "node:path";

export interface QueuedScan {
  cardUid: string;
  idempotencyKey: string;
  queuedAt: string;
}

const QUEUE_PATH = path.join(__dirname, "..", "data", "offline-queue.json");

function ensureFile(): void {
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  if (!fs.existsSync(QUEUE_PATH)) fs.writeFileSync(QUEUE_PATH, "[]");
}

function readAll(): QueuedScan[] {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeAll(items: QueuedScan[]): void {
  ensureFile();
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(items, null, 2));
}

export function enqueue(scan: QueuedScan): void {
  const items = readAll();
  items.push(scan);
  writeAll(items);
}

export function peekAll(): QueuedScan[] {
  return readAll();
}

export function removeByIdempotencyKey(idempotencyKey: string): void {
  const items = readAll().filter((s) => s.idempotencyKey !== idempotencyKey);
  writeAll(items);
}
