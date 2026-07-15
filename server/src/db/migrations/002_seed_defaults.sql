INSERT INTO branches (name, address, phone) VALUES ('Main Branch', NULL, NULL);

INSERT INTO patient_types (name, sort_order) VALUES
  ('Orthopedic', 1),
  ('Sports Fitness', 2),
  ('Others', 3);

INSERT INTO settings (key, value) VALUES
  ('scan_cooldown_seconds', '180'),
  ('scan_confirm_timeout_seconds', '30'),
  ('missed_session_days_threshold', '14'),
  ('whatsapp_provider', 'stub'),
  ('whatsapp_provider_config', '{}'),
  ('admin_whatsapp_number', '');
