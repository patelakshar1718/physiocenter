import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  return value;
}

export const config = {
  deviceToken: required("DEVICE_TOKEN"),
  apiUrl: process.env.API_URL ?? "http://localhost:4000/api/v1",
  offlineRetryIntervalMs: Number(process.env.OFFLINE_RETRY_INTERVAL_MS ?? 15000),
};
