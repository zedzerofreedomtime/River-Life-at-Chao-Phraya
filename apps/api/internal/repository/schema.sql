CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY);
CREATE TABLE IF NOT EXISTS vessels (
 id text PRIMARY KEY, name text NOT NULL, name_th text NOT NULL,
 pier text NOT NULL DEFAULT '', sailing_time text NOT NULL DEFAULT '',
 image_crop text NOT NULL, description text NOT NULL, description_en text NOT NULL,
 active boolean NOT NULL DEFAULT true
);
INSERT INTO vessels(id,name,name_th,pier,sailing_time,image_crop,description,description_en) VALUES
 ('unicorn','Unicorn Cruise','ยูนิคอน','ICONSIAM','19:00–21:00','0 459 660 370','มื้อค่ำและการแสดงบนเรือ ชมวิวสองฝั่งเจ้าพระยา','Dinner and performances on the Chao Phraya.'),
 ('alangka','Alangka Cruise','อลังกา','ICONSIAM','19:15–21:15','0 0 660 459','ล่องเรือยามค่ำจากไอคอนสยาม','An evening cruise from ICONSIAM.'),
 ('viva','VIVA Alangka Cruise','วีว่า','Asiatique','19:45–21:45','660 0 599 459','เริ่มต้นค่ำคืนจากเอเชียทีค','Start your evening from Asiatique.'),
 ('legacy','The Legacy Yacht','เดอะเลกาซี่','','','660 459 599 370','สอบถามท่าเรือ เวลา และแพ็กเกจกับ River Life','Contact River Life to confirm the pier, time and package.')
 ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS sailings (
 id text PRIMARY KEY, vessel_id text NOT NULL REFERENCES vessels(id),
 title text NOT NULL, departure_at timestamptz, boarding_at timestamptz,
 pier text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','closed')),
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sailing_tables (
 sailing_id text NOT NULL REFERENCES sailings(id), id text NOT NULL,
 deck text NOT NULL CHECK(deck IN ('upper','lower')), seats integer NOT NULL CHECK(seats BETWEEN 1 AND 20),
 price integer NOT NULL CHECK(price BETWEEN 1 AND 100000000), PRIMARY KEY(sailing_id,id)
);
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
CREATE TABLE IF NOT EXISTS cruise_reservations (
 id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), sailing_id text NOT NULL REFERENCES sailings(id),
 request_key text NOT NULL, request_hash text NOT NULL, table_ids text[] NOT NULL,
 guest_count integer NOT NULL CHECK(guest_count BETWEEN 1 AND 200), total integer NOT NULL CHECK(total>0),
 status text NOT NULL DEFAULT 'held' CHECK(status IN ('held','cancelled')),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_key)
);
CREATE INDEX IF NOT EXISTS cruise_reservations_sailing ON cruise_reservations(sailing_id,status,expires_at);
ALTER TABLE sailings ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE sailings ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE sailing_tables ADD COLUMN IF NOT EXISTS x integer NOT NULL DEFAULT 0 CHECK(x BETWEEN 0 AND 1000);
ALTER TABLE sailing_tables ADD COLUMN IF NOT EXISTS y integer NOT NULL DEFAULT 0 CHECK(y BETWEEN 0 AND 580);
ALTER TABLE cruise_reservations DROP CONSTRAINT IF EXISTS cruise_reservations_status_check;
ALTER TABLE cruise_reservations ADD CONSTRAINT cruise_reservations_status_check CHECK(status IN ('held','confirmed','cancelled'));
ALTER TABLE cruise_reservations ADD COLUMN IF NOT EXISTS table_total integer NOT NULL DEFAULT 0;
ALTER TABLE cruise_reservations ADD COLUMN IF NOT EXISTS extras_total integer NOT NULL DEFAULT 0;
ALTER TABLE cruise_reservations ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE cruise_reservations ADD COLUMN IF NOT EXISTS requests text[] NOT NULL DEFAULT '{}';
ALTER TABLE cruise_reservations ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '';
ALTER TABLE cruise_reservations ADD COLUMN IF NOT EXISTS customer_phone text NOT NULL DEFAULT '';
ALTER TABLE cruise_reservations ADD COLUMN IF NOT EXISTS terms jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS cruise_reservation_items (
 reservation_id text NOT NULL REFERENCES cruise_reservations(id), extra_id text NOT NULL,
 name text NOT NULL, category text NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 unit_price integer NOT NULL CHECK(unit_price>0), PRIMARY KEY(reservation_id,extra_id)
);
CREATE TABLE IF NOT EXISTS cruise_payments (
 reservation_id text PRIMARY KEY REFERENCES cruise_reservations(id),
 provider text NOT NULL CHECK(provider='manual'), reference text NOT NULL UNIQUE,
 amount integer NOT NULL CHECK(amount>0), actor_id text NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cruise_tickets (
 id text PRIMARY KEY, reservation_id text NOT NULL REFERENCES cruise_reservations(id),
 table_id text NOT NULL, ordinal integer NOT NULL, checked_in_at timestamptz,
 checked_in_by text REFERENCES users(id), UNIQUE(reservation_id,ordinal)
);
CREATE TABLE IF NOT EXISTS cruise_emails (
 reservation_id text NOT NULL REFERENCES cruise_reservations(id), kind text NOT NULL CHECK(kind IN ('booking','tickets')),
 payload jsonb NOT NULL, attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz, stopped_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(reservation_id,kind)
);
CREATE INDEX IF NOT EXISTS cruise_emails_pending ON cruise_emails(next_attempt_at) WHERE sent_at IS NULL AND stopped_at IS NULL;
CREATE TABLE IF NOT EXISTS cruise_admin_audit (
 id bigserial PRIMARY KEY, actor_id text NOT NULL REFERENCES users(id),
 sailing_id text NOT NULL REFERENCES sailings(id), action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
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

-- Additive: existing bookings remain whole-table bookings; no invented seat prices.
ALTER TABLE sailing_tables ADD COLUMN IF NOT EXISTS seat_price INTEGER NOT NULL DEFAULT 0 CHECK(seat_price >= 0);
ALTER TABLE cruise_reservations ADD COLUMN IF NOT EXISTS seat_ids TEXT[] NOT NULL DEFAULT '{}';

-- Omise sandbox checkout attempts survive retries and ambiguous network failures.
ALTER TABLE cruise_payments DROP CONSTRAINT IF EXISTS cruise_payments_provider_check;
ALTER TABLE cruise_payments ADD CONSTRAINT cruise_payments_provider_check CHECK(provider IN ('manual','omise'));
ALTER TABLE cruise_payments ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE cruise_admin_audit ALTER COLUMN actor_id DROP NOT NULL;
CREATE TABLE IF NOT EXISTS omise_checkouts (
 reservation_id text PRIMARY KEY REFERENCES cruise_reservations(id),
 charge_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
