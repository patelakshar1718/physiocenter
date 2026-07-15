import { customAlphabet } from "nanoid";
import { db } from "../../db/connection";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export interface Card {
  id: number;
  uid: string;
  patient_id: number | null;
  status: "issued" | "assigned" | "replaced" | "deactivated";
  issued_at: string;
  assigned_at: string | null;
  deactivated_at: string | null;
  replaced_by_card_id: number | null;
  notes: string | null;
}

export function listCards(filters: { status?: string; patientId?: number }): Card[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.patientId !== undefined) {
    clauses.push("patient_id = ?");
    params.push(filters.patientId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db.prepare(`SELECT * FROM cards ${where} ORDER BY issued_at DESC`).all(...params) as Card[];
}

export function getCard(id: number): Card {
  const row = db.prepare("SELECT * FROM cards WHERE id = ?").get(id) as Card | undefined;
  if (!row) throw new NotFoundError("Card not found");
  return row;
}

export function findCardByUid(uid: string): Card | null {
  const row = db.prepare("SELECT * FROM cards WHERE uid = ?").get(uid) as Card | undefined;
  return row ?? null;
}

export function issueCard(input: { uid?: string; notes?: string }): Card {
  const uid = input.uid?.trim() || `PH-${generateCode()}`;
  const existing = db.prepare("SELECT id FROM cards WHERE uid = ?").get(uid);
  if (existing) throw new ConflictError(`Card code ${uid} already exists`);
  const result = db
    .prepare("INSERT INTO cards (uid, notes) VALUES (?, ?)")
    .run(uid, input.notes ?? null);
  return getCard(Number(result.lastInsertRowid));
}

export function assignCard(cardId: number, patientId: number): Card {
  const card = getCard(cardId);
  if (card.status === "deactivated" || card.status === "replaced") {
    throw new BadRequestError(`Card is ${card.status} and cannot be assigned`);
  }

  const tx = db.transaction(() => {
    // deactivate any other active card already assigned to this patient
    db.prepare(
      "UPDATE cards SET status = 'deactivated', deactivated_at = datetime('now') WHERE patient_id = ? AND status = 'assigned' AND id != ?"
    ).run(patientId, cardId);

    db.prepare(
      "UPDATE cards SET patient_id = ?, status = 'assigned', assigned_at = datetime('now') WHERE id = ?"
    ).run(patientId, cardId);
  });
  tx();

  return getCard(cardId);
}

export function replaceCard(oldCardId: number, input?: { uid?: string; notes?: string }): Card {
  const oldCard = getCard(oldCardId);
  if (!oldCard.patient_id) throw new BadRequestError("Card has no patient to transfer to a replacement");

  const tx = db.transaction(() => {
    const newCard = issueCard({ uid: input?.uid, notes: input?.notes });
    assignCard(newCard.id, oldCard.patient_id as number);
    db.prepare(
      "UPDATE cards SET status = 'replaced', deactivated_at = datetime('now'), replaced_by_card_id = ? WHERE id = ?"
    ).run(newCard.id, oldCardId);
    return newCard.id;
  });
  const newCardId = tx();
  return getCard(newCardId);
}

export function deactivateCard(cardId: number): Card {
  db.prepare(
    "UPDATE cards SET status = 'deactivated', deactivated_at = datetime('now') WHERE id = ?"
  ).run(cardId);
  return getCard(cardId);
}
