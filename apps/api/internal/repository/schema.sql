CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY);
CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL DEFAULT '',
 role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','sales','operator','admin')),
 name text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_identities (
 provider text NOT NULL CHECK(provider IN ('email','google')),
 provider_subject text NOT NULL,
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(provider, provider_subject)
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','sales','operator','admin'));
CREATE INDEX IF NOT EXISTS auth_identities_user ON auth_identities(user_id);
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
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 attachment_path text NOT NULL DEFAULT '',
 slip_path text NOT NULL DEFAULT '',
 slip_hash text NOT NULL DEFAULT '',
 slip_verification jsonb NOT NULL DEFAULT '{}'::jsonb,
 marketing_consent_at timestamptz,
 marketing_consent_version text NOT NULL DEFAULT '',
 marketing_consent_language text NOT NULL DEFAULT ''
);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attachment_path text NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sales_user_id text REFERENCES users(id);
CREATE INDEX IF NOT EXISTS bookings_sales_created ON bookings(sales_user_id,created_at DESC);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS account_token_hash text NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sales_token_hash text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS bookings_user_created ON bookings(user_id,created_at DESC);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slip_hash text NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slip_verification jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketing_consent_version text NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS marketing_consent_language text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS bookings_zone_status ON bookings(zone_id,status,expires_at);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS table_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_count integer NOT NULL DEFAULT 0;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='bookings'::regclass AND conname='bookings_table_quantity_check') THEN
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_quantity_check;
  ALTER TABLE bookings ADD CONSTRAINT bookings_table_quantity_check CHECK (
   (cardinality(table_ids)=0 AND quantity BETWEEN 1 AND 10 AND guest_count=0)
   OR (cardinality(table_ids)>0 AND quantity=4*cardinality(table_ids) AND quantity BETWEEN 4 AND 120 AND guest_count BETWEEN 1 AND quantity)
  );
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS bookings_tables ON bookings USING gin(table_ids);
CREATE INDEX IF NOT EXISTS bookings_slip_hash ON bookings(slip_hash) WHERE slip_hash<>'';
CREATE UNIQUE INDEX IF NOT EXISTS bookings_confirmed_slip_hash_unique ON bookings(slip_hash) WHERE slip_hash<>'' AND status IN ('confirmed','no_show');
CREATE TABLE IF NOT EXISTS tickets (
 id text PRIMARY KEY, booking_id text NOT NULL REFERENCES bookings(id),
 checked_in_at timestamptz
);
CREATE INDEX IF NOT EXISTS tickets_booking ON tickets(booking_id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS table_id text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS stripe_checkouts (
 booking_id text PRIMARY KEY REFERENCES bookings(id),
 session_id text UNIQUE NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_log (
 id bigserial PRIMARY KEY, booking_id text NOT NULL REFERENCES bookings(id),
 action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS cruise_program (
 id integer PRIMARY KEY CHECK(id=1), title text NOT NULL, sailing_date text,
 boarding text NOT NULL, departure text NOT NULL, pier text NOT NULL,
 pier_number integer NOT NULL CHECK(pier_number>0), duration_minutes integer NOT NULL CHECK(duration_minutes>0)
);
INSERT INTO cruise_program VALUES(1,'Concert on the River',NULL,'18:45','19:00','ICONSIAM',4,120) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS staff_audit (
 id bigserial PRIMARY KEY, actor_id text NOT NULL REFERENCES users(id),
 action text NOT NULL, target_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

-- Only future confirmation transitions enqueue mail; existing bookings are not backfilled.
CREATE TABLE IF NOT EXISTS booking_emails (
 booking_id text NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('booking','tickets')),
 program jsonb NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz,
 stopped_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(booking_id,kind)
);
CREATE INDEX IF NOT EXISTS booking_emails_pending ON booking_emails(next_attempt_at)
 WHERE sent_at IS NULL AND stopped_at IS NULL;
CREATE OR REPLACE FUNCTION queue_booking_emails() RETURNS trigger AS $$
BEGIN
 IF NEW.status='confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
  INSERT INTO booking_emails(booking_id,kind,program)
   SELECT NEW.id,k,COALESCE((SELECT to_jsonb(p) FROM cruise_program p WHERE id=1),'{}'::jsonb)
   FROM unnest(ARRAY['booking','tickets']) AS k ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER booking_confirmation_emails AFTER UPDATE OF status ON bookings
 FOR EACH ROW EXECUTE FUNCTION queue_booking_emails();
