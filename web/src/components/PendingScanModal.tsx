import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScanPendingPayload } from "../api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  pending: ScanPendingPayload;
  timeoutSeconds: number;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}

export default function PendingScanModal({ pending, timeoutSeconds, onConfirm, onCancel, busy }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);

  useEffect(() => {
    setSecondsLeft(timeoutSeconds);
    const scannedAtMs = new Date(pending.scannedAt.replace(" ", "T") + "Z").getTime();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - scannedAtMs) / 1000);
      setSecondsLeft(Math.max(0, timeoutSeconds - elapsed));
    }, 500);
    return () => clearInterval(interval);
  }, [pending, timeoutSeconds]);

  const remainingAfterConfirm = pending.remaining - 1;
  const progress = Math.max(0, Math.min(1, secondsLeft / timeoutSeconds));

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent hideClose className="max-w-md text-center">
        {pending.branchMismatch && (
          <div className="mb-3">
            <Badge variant="warning">Visiting from another branch</Badge>
          </div>
        )}

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {pending.patient.photo_url ? (
            <img
              src={pending.patient.photo_url}
              alt={pending.patient.full_name}
              className="w-20 h-20 rounded-full mx-auto object-cover mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-full mx-auto bg-accent text-accent-foreground flex items-center justify-center text-2xl font-semibold mb-4">
              {pending.patient.full_name.charAt(0).toUpperCase()}
            </div>
          )}
        </motion.div>

        <h2 className="text-2xl font-semibold text-foreground">{pending.patient.full_name}</h2>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{pending.cardUid}</p>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div>
            <div className="text-3xl font-bold text-foreground">{remainingAfterConfirm}</div>
            <div>remaining after this</div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-3xl font-bold text-muted-foreground/60">{pending.granted}</div>
            <div>total granted</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${progress * 100}%` }}
              transition={{ ease: "linear", duration: 0.5 }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Auto-cancels in {secondsLeft}s if not confirmed</p>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={busy}>
            {busy ? "Confirming..." : "Confirm Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
