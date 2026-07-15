import { SCAN_EXPIRY_SWEEP_INTERVAL_MS } from "../config/constants";
import { expireStalePending } from "../modules/scans/scans.service";
import { logger } from "../shared/logger";

export function startScanExpiryJob(): NodeJS.Timeout {
  return setInterval(() => {
    try {
      const count = expireStalePending();
      if (count > 0) logger.debug(`Expired ${count} stale pending scan(s)`);
    } catch (err) {
      logger.error({ err }, "scanExpiry job failed");
    }
  }, SCAN_EXPIRY_SWEEP_INTERVAL_MS);
}
