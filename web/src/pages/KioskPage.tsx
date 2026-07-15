import { FormEvent, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine } from "lucide-react";
import { api, ApiError } from "../api/client";
import { connectSocket, disconnectSocket } from "../realtime/socket";
import { PatientDetail, ScanEvent, ScanPendingPayload, SettingsMap } from "../api/types";
import { useApp } from "../context/AppContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/patterns";
import PendingScanModal from "@/components/PendingScanModal";

const blockReasonLabels: Record<string, string> = {
  unassigned_card: "This card isn't assigned to any patient.",
  inactive_patient: "This patient is inactive.",
  branch_restricted: "This patient isn't allowed to scan at this branch.",
  duplicate_cooldown: "This card was just scanned — please wait a moment before scanning again.",
  zero_remaining: "This patient has 0 sessions remaining. Top up before scanning again.",
};

interface FeedItem {
  id: number;
  message: string;
  tone: "success" | "error" | "neutral";
  at: string;
}

async function hydratePendingEvent(event: ScanEvent): Promise<ScanPendingPayload | null> {
  if (!event.patient_id) return null;
  const detail = await api.get<PatientDetail>(`/patients/${event.patient_id}`);
  const { patient, sessionSummary } = detail;
  return {
    scanEventId: event.id,
    patient: { id: patient.id, full_name: patient.full_name, photo_url: patient.photo_url },
    cardUid: "",
    branchMismatch: event.branch_id !== patient.branch_id,
    granted: sessionSummary.granted,
    used: sessionSummary.used,
    remaining: sessionSummary.remaining,
    scannedAt: event.scanned_at,
  };
}

export default function KioskPage() {
  const { admin, token, selectedBranchId } = useApp();
  const activeBranchId = admin?.branchId ?? selectedBranchId;

  const [cardUid, setCardUid] = useState("");
  const [pending, setPending] = useState<ScanPendingPayload | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<SettingsMap>("/settings").then(setSettings);
  }, []);

  useEffect(() => {
    if (!token || activeBranchId === null || activeBranchId === undefined) return;

    const socket = connectSocket(token, activeBranchId);

    socket.on("scan:pending", (payload: ScanPendingPayload) => {
      setPending(payload);
      inputRef.current?.blur();
    });

    socket.on("scan:confirmed", (data: { scanEventId: number; remainingAfter: number }) => {
      setPending((cur) => (cur?.scanEventId === data.scanEventId ? null : cur));
      setFeed((f) => [
        { id: data.scanEventId, message: `Confirmed — ${data.remainingAfter} remaining`, tone: "success", at: new Date().toLocaleTimeString() },
        ...f.slice(0, 9),
      ]);
    });

    socket.on("scan:cancelled", (data: { scanEventId: number }) => {
      setPending((cur) => (cur?.scanEventId === data.scanEventId ? null : cur));
    });

    socket.on("scan:expired", (data: { scanEventId: number }) => {
      setPending((cur) => (cur?.scanEventId === data.scanEventId ? null : cur));
      setFeed((f) => [
        { id: data.scanEventId, message: "Scan expired (no confirmation in time)", tone: "error", at: new Date().toLocaleTimeString() },
        ...f.slice(0, 9),
      ]);
    });

    socket.on("scan:blocked", (data: { scanEventId: number; reason: string }) => {
      setFeed((f) => [
        { id: data.scanEventId, message: blockReasonLabels[data.reason] ?? data.reason, tone: "error", at: new Date().toLocaleTimeString() },
        ...f.slice(0, 9),
      ]);
    });

    api.get<ScanEvent[]>(`/scans/pending?branch_id=${activeBranchId}`).then(async (events) => {
      const stillPending = events[0];
      if (stillPending) {
        const hydrated = await hydratePendingEvent(stillPending);
        if (hydrated) setPending(hydrated);
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [token, activeBranchId]);

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!cardUid.trim() || activeBranchId === null || activeBranchId === undefined) return;
    setBanner(null);
    try {
      const event = await api.post<ScanEvent>("/scans/manual", {
        card_uid: cardUid.trim(),
        branch_id: activeBranchId,
      });
      setCardUid("");
      if (event.status === "blocked") {
        setBanner({ tone: "error", message: blockReasonLabels[event.block_reason ?? ""] ?? "Scan blocked." });
      }
    } catch (err) {
      setBanner({ tone: "error", message: err instanceof ApiError ? err.message : "Scan failed." });
    }
  }

  async function handleConfirm() {
    if (!pending) return;
    setConfirmBusy(true);
    try {
      await api.post(`/scans/${pending.scanEventId}/confirm`);
      setPending(null);
    } catch (err) {
      setBanner({ tone: "error", message: err instanceof ApiError ? err.message : "Could not confirm scan." });
      setPending(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  async function handleCancel() {
    if (!pending) return;
    setConfirmBusy(true);
    try {
      await api.post(`/scans/${pending.scanEventId}/cancel`);
    } finally {
      setPending(null);
      setConfirmBusy(false);
    }
  }

  if (activeBranchId === null || activeBranchId === undefined) {
    return (
      <div>
        <PageHeader title="Kiosk" />
        <Card className="p-6 text-sm text-muted-foreground">
          Select a branch from the branch selector (top-right on desktop, inside the menu on mobile) to start
          scanning.
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Kiosk" />

      <Card className="p-6 mb-6 max-w-xl">
        <form onSubmit={handleScan} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Enter or scan card code (e.g. PH-7K2Q9X)"
              value={cardUid}
              onChange={(e) => setCardUid(e.target.value)}
              className="pl-9 font-mono"
            />
          </div>
          <Button type="submit" className="sm:w-fit">
            Scan
          </Button>
        </form>
        <AnimatePresence>
          {banner && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-3 text-sm ${banner.tone === "error" ? "text-destructive" : "text-success"}`}
            >
              {banner.message}
            </motion.p>
          )}
        </AnimatePresence>
        <p className="mt-3 text-xs text-muted-foreground">
          No NFC reader connected yet — type or paste the patient's card code above. Once a reader is set up, taps
          will feed into this same screen automatically.
        </p>
      </Card>

      <Card className="p-4 max-w-xl">
        <h2 className="text-sm font-medium text-foreground/80 mb-2">Recent activity</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {feed.map((f) => (
                <motion.li
                  key={`${f.id}-${f.at}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex justify-between text-sm"
                >
                  <span className={f.tone === "error" ? "text-destructive" : "text-foreground/80"}>{f.message}</span>
                  <span className="text-muted-foreground text-xs">{f.at}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>

      <AnimatePresence>
        {pending && (
          <PendingScanModal
            pending={pending}
            timeoutSeconds={Number(settings?.scan_confirm_timeout_seconds ?? 30)}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            busy={confirmBusy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
