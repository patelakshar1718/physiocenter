export const DEFAULT_SETTINGS = {
  scan_cooldown_seconds: "180",
  scan_confirm_timeout_seconds: "30",
  missed_session_days_threshold: "14",
  whatsapp_provider: "stub",
  whatsapp_provider_config: "{}",
  admin_whatsapp_number: "",
} as const;

export const SCAN_EXPIRY_SWEEP_INTERVAL_MS = 10_000;
export const JWT_EXPIRES_IN = "12h";
