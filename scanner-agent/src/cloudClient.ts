import fetch from "node-fetch";
import { config } from "./config";
import * as offlineQueue from "./offlineQueue";

const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postIngest(cardUid: string, idempotencyKey: string): Promise<boolean> {
  const res = await fetch(`${config.apiUrl}/scans/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.deviceToken}`,
    },
    body: JSON.stringify({ card_uid: cardUid, idempotency_key: idempotencyKey }),
  });
  return res.ok;
}

/** Submits one physical tap. Retries briefly, then queues it locally if the
 * cloud is unreachable so the tap isn't lost — the queue is flushed once
 * connectivity returns. The idempotency key makes retries/re-flushes safe. */
export async function submitScan(cardUid: string, idempotencyKey: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ok = await postIngest(cardUid, idempotencyKey);
      if (ok) return;
    } catch {
      // network error — fall through to retry/backoff
    }
    if (attempt < MAX_RETRIES) await sleep(500 * attempt);
  }

  console.warn(`Could not reach server for tap ${cardUid} — queuing offline.`);
  offlineQueue.enqueue({ cardUid, idempotencyKey, queuedAt: new Date().toISOString() });
}

export async function flushOfflineQueue(): Promise<void> {
  const items = offlineQueue.peekAll();
  for (const item of items) {
    try {
      const ok = await postIngest(item.cardUid, item.idempotencyKey);
      if (ok) {
        offlineQueue.removeByIdempotencyKey(item.idempotencyKey);
        console.log(`Flushed queued tap ${item.cardUid} (queued at ${item.queuedAt})`);
      }
    } catch {
      // still offline — leave it queued, try again next interval
    }
  }
}
