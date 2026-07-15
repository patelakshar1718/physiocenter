import { createServer } from "node:http";
import { env } from "./config/env";
import { runMigrations } from "./db/migrate";
import { createApp } from "./app";
import { initSocket } from "./realtime/socket";
import { startScanExpiryJob } from "./jobs/scanExpiry.job";
import { logger } from "./shared/logger";

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
});

runMigrations();

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);
startScanExpiryJob();

httpServer.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`);
});
