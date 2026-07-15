import { getIO, branchRoom } from "../../realtime/socket";

type ScanSocketEvent = "scan:pending" | "scan:confirmed" | "scan:cancelled" | "scan:expired" | "scan:blocked";

export function emitScanEvent(branchId: number, event: ScanSocketEvent, payload: unknown): void {
  try {
    getIO().to(branchRoom(branchId)).emit(event, payload);
  } catch {
    // Socket.IO not initialized (e.g. running a script/test outside the HTTP server) — safe to skip.
  }
}
