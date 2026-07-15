import crypto from "node:crypto";
// nfc-pcsc has no published TypeScript types; declared loosely in src/types/nfc-pcsc.d.ts
import { NFC } from "nfc-pcsc";

const HARDWARE_DEBOUNCE_MS = 800; // some readers fire multiple low-level events per physical tap

export type OnTap = (cardUid: string, idempotencyKey: string) => void;

export function startNfcReader(onTap: OnTap): void {
  const nfc = new NFC();
  let lastUid: string | null = null;
  let lastTapAt = 0;

  nfc.on("reader", (reader: any) => {
    console.log(`NFC reader attached: ${reader.reader.name}`);

    reader.on("card", (card: { uid: string }) => {
      const now = Date.now();
      if (card.uid === lastUid && now - lastTapAt < HARDWARE_DEBOUNCE_MS) {
        return; // hardware chatter from the same physical tap, ignore
      }
      lastUid = card.uid;
      lastTapAt = now;
      onTap(card.uid, crypto.randomUUID());
    });

    reader.on("error", (err: Error) => {
      console.error(`Reader error (${reader.reader.name}):`, err.message);
    });

    reader.on("end", () => {
      console.log(`NFC reader detached: ${reader.reader.name}`);
    });
  });

  nfc.on("error", (err: Error) => {
    console.error("NFC error:", err.message);
  });
}
