CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY);
CREATE TABLE IF NOT EXISTS zones (
 id text PRIMARY KEY, name text NOT NULL, capacity integer NOT NULL CHECK(capacity>=0),
 price integer NOT NULL CHECK(price>=0), active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS bookings (
 id text PRIMARY KEY, token_hash text NOT NULL, request_key text UNIQUE NOT NULL,
 request_hash text NOT NULL, zone_id text NOT NULL REFERENCES zones(id),
 name text NOT NULL, email text NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 total integer NOT NULL CHECK(total>=0), agent_code text NOT NULL DEFAULT '',
 status text NOT NULL CHECK(status IN ('held','review','confirmed','cancelled','expired','no_show')),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_zone_status ON bookings(zone_id,status,expires_at);
CREATE TABLE IF NOT EXISTS tickets (
 id text PRIMARY KEY, booking_id text NOT NULL REFERENCES bookings(id),
 checked_in_at timestamptz
);
CREATE INDEX IF NOT EXISTS tickets_booking ON tickets(booking_id);
CREATE TABLE IF NOT EXISTS audit_log (
 id bigserial PRIMARY KEY, booking_id text NOT NULL REFERENCES bookings(id),
 action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
