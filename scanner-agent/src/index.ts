import { config } from "./config";
import { startNfcReader } from "./nfcReader";
import { submitScan, flushOfflineQueue } from "./cloudClient";

console.log(`PhysioCenter scanner-agent starting, API: ${config.apiUrl}`);

try {
  startNfcReader((cardUid, idempotencyKey) => {
    console.log(`Tap detected: ${cardUid}`);
    submitScan(cardUid, idempotencyKey).catch((err) => {
      console.error("Failed to submit scan:", err);
    });
  });
} catch (err) {
  console.error(
    "Could not start the NFC reader (is a PC/SC-compatible reader plugged in and its driver installed?). " +
      "The agent will keep running and retry flushing any previously queued taps.",
    err
  );
}

setInterval(() => {
  flushOfflineQueue().catch((err) => console.error("Offline queue flush failed:", err));
}, config.offlineRetryIntervalMs);

process.on("SIGINT", () => {
  console.log("Shutting down scanner-agent.");
  process.exit(0);
});
