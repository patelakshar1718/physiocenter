import { db } from "../../db/connection";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { findCardByUid } from "../cards/cards.service";
import { getPatient } from "../patients/patients.service";
import { getSessionSummary } from "../sessions/sessions.service";
import { getSettingInt, getSetting } from "../settings/settings.service";
import { emitScanEvent } from "./scans.gateway";
import * as whatsapp from "../whatsapp/whatsapp.service";

export type ScanStatus = "pending" | "confirmed" | "cancelled" | "blocked" | "expired";
export type BlockReason =
  | "unknown_card"
  | "unassigned_card"
  | "inactive_patient"
  | "branch_restricted"
  | "duplicate_cooldown"
  | "zero_remaining";

export interface ScanEvent {
  id: number;
  card_id: number;
  patient_id: number | null;
  branch_id: number;
  device_id: number | null;
  source: "manual" | "device";
  status: ScanStatus;
  block_reason: string | null;
  scanned_at: string;
  resolved_at: string | null;
  resolved_by_admin_id: number | null;
  remaining_after: number | null;
  used_after: number | null;
  idempotency_key: string | null;
}

export interface ScanPendingPayload {
  scanEventId: number;
  patient: { id: number; full_name: string; photo_url: string | null };
  cardUid: string;
  branchMismatch: boolean;
  granted: number;
  used: number;
  remaining: number;
  scannedAt: string;
}

interface IngestInput {
  cardUid: string;
  idempotencyKey: string;
  source: "manual" | "device";
  branchId: number;
  deviceId?: number;
}

function getScanEvent(id: number): ScanEvent {
  const row = db.prepare("SELECT * FROM scan_events WHERE id = ?").get(id) as ScanEvent | undefined;
  if (!row) throw new NotFoundError("Scan event not found");
  return row;
}

function findByIdempotencyKey(key: string): ScanEvent | null {
  const row = db.prepare("SELECT * FROM scan_events WHERE idempotency_key = ?").get(key) as
    | ScanEvent
    | undefined;
  return row ?? null;
}

function insertBlocked(params: {
  cardId: number;
  patientId: number | null;
  branchId: number;
  deviceId: number | null;
  source: "manual" | "device";
  idempotencyKey: string;
  reason: BlockReason;
}): ScanEvent {
  const result = db
    .prepare(
      `INSERT INTO scan_events (card_id, patient_id, branch_id, device_id, source, status, block_reason, idempotency_key)
       VALUES (?, ?, ?, ?, ?, 'blocked', ?, ?)`
    )
    .run(
      params.cardId,
      params.patientId,
      params.branchId,
      params.deviceId,
      params.source,
      params.reason,
      params.idempotencyKey
    );
  const row = getScanEvent(Number(result.lastInsertRowid));
  emitScanEvent(params.branchId, "scan:blocked", { scanEventId: row.id, reason: params.reason });
  return row;
}

/** Every scan a patient makes — whether from the Kiosk manual-entry field or a real
 * scanner-agent tap once hardware exists — funnels through this single function. */
export function ingestScan(input: IngestInput): ScanEvent {
  const existing = findByIdempotencyKey(input.idempotencyKey);
  if (existing) return existing;

  const card = findCardByUid(input.cardUid.trim());
  if (!card) throw new BadRequestError(`Unknown card code: ${input.cardUid}`);

  if (card.status !== "assigned" || !card.patient_id) {
    return insertBlocked({
      cardId: card.id,
      patientId: card.patient_id,
      branchId: input.branchId,
      deviceId: input.deviceId ?? null,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
      reason: "unassigned_card",
    });
  }

  const patient = getPatient(card.patient_id);

  if (!patient.is_active) {
    return insertBlocked({
      cardId: card.id,
      patientId: patient.id,
      branchId: input.branchId,
      deviceId: input.deviceId ?? null,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
      reason: "inactive_patient",
    });
  }

  const branchMismatch = input.branchId !== patient.branch_id;
  if (branchMismatch && !patient.allow_any_branch_scan) {
    return insertBlocked({
      cardId: card.id,
      patientId: patient.id,
      branchId: input.branchId,
      deviceId: input.deviceId ?? null,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
      reason: "branch_restricted",
    });
  }

  const cooldownSeconds = getSettingInt("scan_cooldown_seconds");
  const recentDuplicate = db
    .prepare(
      `SELECT id FROM scan_events
       WHERE card_id = ? AND status IN ('pending','confirmed')
       AND scanned_at >= datetime('now', ?)
       ORDER BY scanned_at DESC LIMIT 1`
    )
    .get(card.id, `-${cooldownSeconds} seconds`);
  if (recentDuplicate) {
    return insertBlocked({
      cardId: card.id,
      patientId: patient.id,
      branchId: input.branchId,
      deviceId: input.deviceId ?? null,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
      reason: "duplicate_cooldown",
    });
  }

  const summary = getSessionSummary(patient.id);
  if (summary.remaining <= 0) {
    return insertBlocked({
      cardId: card.id,
      patientId: patient.id,
      branchId: input.branchId,
      deviceId: input.deviceId ?? null,
      source: input.source,
      idempotencyKey: input.idempotencyKey,
      reason: "zero_remaining",
    });
  }

  const result = db
    .prepare(
      `INSERT INTO scan_events (card_id, patient_id, branch_id, device_id, source, status, idempotency_key)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(card.id, patient.id, input.branchId, input.deviceId ?? null, input.source, input.idempotencyKey);

  const scanEvent = getScanEvent(Number(result.lastInsertRowid));

  const payload: ScanPendingPayload = {
    scanEventId: scanEvent.id,
    patient: { id: patient.id, full_name: patient.full_name, photo_url: patient.photo_url },
    cardUid: card.uid,
    branchMismatch,
    granted: summary.granted,
    used: summary.used,
    remaining: summary.remaining,
    scannedAt: scanEvent.scanned_at,
  };
  emitScanEvent(input.branchId, "scan:pending", payload);

  return scanEvent;
}

export function listPending(branchId?: number): ScanEvent[] {
  if (branchId !== undefined) {
    return db
      .prepare("SELECT * FROM scan_events WHERE status = 'pending' AND branch_id = ? ORDER BY scanned_at")
      .all(branchId) as ScanEvent[];
  }
  return db.prepare("SELECT * FROM scan_events WHERE status = 'pending' ORDER BY scanned_at").all() as ScanEvent[];
}

export async function confirmScan(scanEventId: number, adminId: number): Promise<ScanEvent> {
  const event = getScanEvent(scanEventId);
  if (event.status !== "pending") {
    throw new BadRequestError(`Scan event is ${event.status}, not pending`);
  }
  if (!event.patient_id) throw new BadRequestError("Scan event has no linked patient");

  const patient = getPatient(event.patient_id);

  // Re-validate guards: state may have changed since the pending row was created
  // (e.g. another scan for the same patient was confirmed in the meantime).
  if (!patient.is_active) {
    return blockPendingEvent(event, "inactive_patient");
  }
  const branchMismatch = event.branch_id !== patient.branch_id;
  if (branchMismatch && !patient.allow_any_branch_scan) {
    return blockPendingEvent(event, "branch_restricted");
  }
  const summary = getSessionSummary(patient.id);
  if (summary.remaining <= 0) {
    return blockPendingEvent(event, "zero_remaining");
  }

  const usedAfter = summary.used + 1;
  const remainingAfter = summary.granted - usedAfter;

  db.prepare(
    `UPDATE scan_events
     SET status = 'confirmed', resolved_at = datetime('now'), resolved_by_admin_id = ?,
         used_after = ?, remaining_after = ?
     WHERE id = ?`
  ).run(adminId, usedAfter, remainingAfter, scanEventId);

  const updated = getScanEvent(scanEventId);
  emitScanEvent(event.branch_id, "scan:confirmed", {
    scanEventId: updated.id,
    patientId: patient.id,
    usedAfter,
    remainingAfter,
  });

  await sendConfirmationMessages({ patient, usedAfter, remainingAfter, grantedTotal: summary.granted, scanEventId: updated.id });

  return updated;
}

function blockPendingEvent(event: ScanEvent, reason: BlockReason): ScanEvent {
  db.prepare(
    "UPDATE scan_events SET status = 'blocked', block_reason = ?, resolved_at = datetime('now') WHERE id = ?"
  ).run(reason, event.id);
  const updated = getScanEvent(event.id);
  emitScanEvent(event.branch_id, "scan:blocked", { scanEventId: event.id, reason });
  return updated;
}

export function cancelScan(scanEventId: number, adminId: number): ScanEvent {
  const event = getScanEvent(scanEventId);
  if (event.status !== "pending") {
    throw new BadRequestError(`Scan event is ${event.status}, not pending`);
  }
  db.prepare(
    "UPDATE scan_events SET status = 'cancelled', resolved_at = datetime('now'), resolved_by_admin_id = ? WHERE id = ?"
  ).run(adminId, scanEventId);
  const updated = getScanEvent(scanEventId);
  emitScanEvent(event.branch_id, "scan:cancelled", { scanEventId });
  return updated;
}

export function expireStalePending(): number {
  const timeoutSeconds = getSettingInt("scan_confirm_timeout_seconds");
  const stale = db
    .prepare(
      `SELECT id, branch_id FROM scan_events
       WHERE status = 'pending' AND scanned_at < datetime('now', ?)`
    )
    .all(`-${timeoutSeconds} seconds`) as { id: number; branch_id: number }[];

  if (stale.length === 0) return 0;

  const update = db.prepare(
    "UPDATE scan_events SET status = 'expired', resolved_at = datetime('now') WHERE id = ?"
  );
  for (const row of stale) {
    update.run(row.id);
    emitScanEvent(row.branch_id, "scan:expired", { scanEventId: row.id });
  }
  return stale.length;
}

async function sendConfirmationMessages(params: {
  patient: { id: number; full_name: string; whatsapp_number: string };
  usedAfter: number;
  remainingAfter: number;
  grantedTotal: number;
  scanEventId: number;
}): Promise<void> {
  const { patient, usedAfter, remainingAfter, grantedTotal, scanEventId } = params;

  await whatsapp.notify({
    patientId: patient.id,
    to: patient.whatsapp_number,
    templateKey: "scan_confirmed",
    message: whatsapp.renderScanConfirmed({
      patientName: patient.full_name,
      used: usedAfter,
      remaining: remainingAfter,
      granted: grantedTotal,
    }),
    scanEventId,
  });

  const adminNumber = getSetting("admin_whatsapp_number");
  if (!adminNumber) return;

  if (remainingAfter === 1) {
    await whatsapp.notify({
      patientId: patient.id,
      to: adminNumber,
      templateKey: "low_sessions_admin",
      message: whatsapp.renderLowSessionsAdmin({ patientName: patient.full_name, remaining: remainingAfter }),
      scanEventId,
    });
  } else if (remainingAfter === 0) {
    await whatsapp.notify({
      patientId: patient.id,
      to: adminNumber,
      templateKey: "zero_sessions_admin",
      message: whatsapp.renderZeroSessionsAdmin({ patientName: patient.full_name }),
      scanEventId,
    });
  }
}

export function getScanEventById(id: number): ScanEvent {
  return getScanEvent(id);
}
