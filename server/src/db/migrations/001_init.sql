CREATE TABLE branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  branch_id INTEGER REFERENCES branches(id), -- NULL = super-admin (sees all branches)
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE patient_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  contact_phone TEXT,
  whatsapp_number TEXT NOT NULL,
  patient_type_id INTEGER REFERENCES patient_types(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  allow_any_branch_scan INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  photo_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_patients_branch ON patients(branch_id);
CREATE INDEX idx_patients_type ON patients(patient_type_id);

CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL UNIQUE,
  patient_id INTEGER REFERENCES patients(id),
  status TEXT NOT NULL DEFAULT 'issued'
         CHECK (status IN ('issued','assigned','replaced','deactivated')),
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  assigned_at TEXT,
  deactivated_at TEXT,
  replaced_by_card_id INTEGER REFERENCES cards(id),
  notes TEXT
);
CREATE INDEX idx_cards_patient ON cards(patient_id);

CREATE TABLE session_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'initial_assignment' | 'topup' | 'correction'
  note TEXT,
  created_by_admin_id INTEGER REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_adjustments_patient ON session_adjustments(patient_id);

CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  api_token_hash TEXT NOT NULL,
  last_seen_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE scan_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id),
  patient_id INTEGER REFERENCES patients(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  device_id INTEGER REFERENCES devices(id),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','device')),
  status TEXT NOT NULL DEFAULT 'pending'
         CHECK (status IN ('pending','confirmed','cancelled','blocked','expired')),
  block_reason TEXT, -- 'zero_remaining' | 'duplicate_cooldown' | 'unassigned_card' | 'inactive_patient' | 'branch_restricted'
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved_by_admin_id INTEGER REFERENCES admin_users(id),
  remaining_after INTEGER,
  used_after INTEGER,
  idempotency_key TEXT UNIQUE
);
CREATE INDEX idx_scan_events_card_time ON scan_events(card_id, scanned_at);
CREATE INDEX idx_scan_events_status ON scan_events(status);
CREATE INDEX idx_scan_events_patient ON scan_events(patient_id);
CREATE INDEX idx_scan_events_branch ON scan_events(branch_id);

CREATE TABLE whatsapp_message_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER REFERENCES patients(id),
  to_number TEXT NOT NULL,
  template_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
         CHECK (status IN ('pending','sent','failed')),
  error TEXT,
  scan_event_id INTEGER REFERENCES scan_events(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_whatsapp_log_patient ON whatsapp_message_log(patient_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
