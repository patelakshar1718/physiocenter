import { db } from "../../db/connection";
import { getActiveProvider } from "./whatsapp.factory";

export function renderScanConfirmed(p: {
  patientName: string;
  used: number;
  remaining: number;
  granted: number;
}): string {
  return `Hi ${p.patientName}, your session is confirmed. ${p.used} used, ${p.remaining} remaining out of ${p.granted}.`;
}

export function renderLowSessionsAdmin(p: { patientName: string; remaining: number }): string {
  return `Reminder: ${p.patientName} has ${p.remaining} session(s) remaining.`;
}

export function renderZeroSessionsAdmin(p: { patientName: string }): string {
  return `${p.patientName} has 0 sessions remaining. Re-examine and top up if treatment continues.`;
}

interface NotifyInput {
  patientId: number | null;
  to: string;
  templateKey: "scan_confirmed" | "low_sessions_admin" | "zero_sessions_admin";
  message: string;
  scanEventId?: number;
}

export async function notify(input: NotifyInput): Promise<void> {
  const provider = getActiveProvider();
  const logInsert = db.prepare(
    `INSERT INTO whatsapp_message_log
      (patient_id, to_number, template_key, payload_json, provider, status, scan_event_id)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  );
  const result = logInsert.run(
    input.patientId,
    input.to,
    input.templateKey,
    JSON.stringify({ message: input.message }),
    provider.name,
    input.scanEventId ?? null
  );
  const logId = Number(result.lastInsertRowid);

  try {
    const sendResult = await provider.sendMessage({
      to: input.to,
      templateKey: input.templateKey,
      params: { message: input.message },
    });
    db.prepare(
      "UPDATE whatsapp_message_log SET status = ?, provider_message_id = ?, error = ? WHERE id = ?"
    ).run(sendResult.status, sendResult.providerMessageId ?? null, sendResult.error ?? null, logId);
  } catch (err) {
    db.prepare("UPDATE whatsapp_message_log SET status = 'failed', error = ? WHERE id = ?").run(
      err instanceof Error ? err.message : String(err),
      logId
    );
  }
}
