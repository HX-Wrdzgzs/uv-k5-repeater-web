-- Remove explicitly excluded receive-only entries from the public repeater dataset.
-- This is intentionally limited to these two exact station keys and does not touch
-- users, submissions, reports, audit logs, sessions, or other repeater records.
DELETE FROM repeaters
WHERE station_key IN (
  'RXAIR1215|全国|收听专用|航空|V',
  'RXRAIL4675|全国|收听专用|铁路|U'
);
