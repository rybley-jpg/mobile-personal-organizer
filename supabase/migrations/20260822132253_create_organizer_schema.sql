/*
# Persönlicher Organizer - Grundschema

## Übersicht
Legt das komplette Datenmodell für die Organisations-App an: Kategorien,
Aufgaben, Reisen mit Etappen, und Kontakte. Die App hat keinen Login-Bereich
(Einzelnutzer-App), daher sind alle Daten für den anonymen Zugriffsschlüssel
lesbar und schreibbar.

## 1. Neue Tabellen

- `categories` – Kategorien für Aufgaben/Kontakte (Name, Farbe, Icon)
- `trips` – Reisen (Name, Ziel, Notizen, Ansprechpartner, Buchungslinks)
- `trip_segments` – einzelne Etappen einer Reise (Flug/Hotel/Mietwagen/Sonstiges)
  mit allen Flugdetails (Fluggesellschaft, Flugnummer, Terminal, Gate, Sitzplatz...)
- `tasks` – Aufgaben/To-dos mit Datum, Uhrzeit, Priorität, Kategorie,
  Erinnerungsvorlauf, optionaler Verknüpfung zu einer Reise
- `contacts` – wichtige Kontakte mit Telefonnummern und E-Mail

## 2. Sicherheit
Row Level Security ist auf allen Tabellen aktiv. Da die App keinen Login hat,
dürfen sowohl `anon` als auch `authenticated` lesen und schreiben (bewusst
geteilte, persönliche Einzelnutzer-Daten, kein Multi-Tenant-Schutz nötig).

## 3. Beispieldaten
Es werden realistische Beispieldaten eingefügt (Standardkategorien, eine
Namibia-Reise mit zwei Flugetappen, einige Aufgaben und Kontakte), damit die
Funktionsweise der App sofort sichtbar ist. Die Einfügungen sind so
geschützt, dass ein erneutes Ausführen der Migration keine Duplikate erzeugt.
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  icon text NOT NULL DEFAULT 'tag',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  destination text,
  notes text,
  contact_person text,
  contact_phone text,
  booking_links text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  segment_type text NOT NULL DEFAULT 'flug' CHECK (segment_type IN ('flug', 'hotel', 'mietwagen', 'sonstiges')),
  title text,
  from_location text,
  to_location text,
  departure_date date,
  departure_time time,
  arrival_date date,
  arrival_time time,
  airline text,
  flight_number text,
  booking_number text,
  terminal text,
  gate text,
  seat text,
  baggage_info text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date,
  due_time time,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('niedrig', 'normal', 'hoch')),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'erledigt')),
  repeat_rule text CHECK (repeat_rule IS NULL OR repeat_rule IN ('taeglich', 'woechentlich', 'monatlich', 'jaehrlich')),
  reminder_offset text NOT NULL DEFAULT 'none' CHECK (reminder_offset IN ('none', 'at_time', '15m', '1h', '2h', '1d', '3d', '7d')),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  is_suggested boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization text,
  phone text,
  phone_alt text,
  email text,
  category text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_trip_id ON tasks(trip_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_trip_segments_trip_id ON trip_segments(trip_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_trips" ON trips;
CREATE POLICY "anon_select_trips" ON trips FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_trips" ON trips;
CREATE POLICY "anon_insert_trips" ON trips FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_trips" ON trips;
CREATE POLICY "anon_update_trips" ON trips FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_trips" ON trips;
CREATE POLICY "anon_delete_trips" ON trips FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_trip_segments" ON trip_segments;
CREATE POLICY "anon_select_trip_segments" ON trip_segments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_trip_segments" ON trip_segments;
CREATE POLICY "anon_insert_trip_segments" ON trip_segments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_trip_segments" ON trip_segments;
CREATE POLICY "anon_update_trip_segments" ON trip_segments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_trip_segments" ON trip_segments;
CREATE POLICY "anon_delete_trip_segments" ON trip_segments FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_contacts" ON contacts;
CREATE POLICY "anon_select_contacts" ON contacts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_contacts" ON contacts;
CREATE POLICY "anon_insert_contacts" ON contacts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_contacts" ON contacts;
CREATE POLICY "anon_update_contacts" ON contacts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_contacts" ON contacts;
CREATE POLICY "anon_delete_contacts" ON contacts FOR DELETE TO anon, authenticated USING (true);

INSERT INTO categories (name, color, icon, is_default) VALUES
  ('Privat', '#64748b', 'home', true),
  ('Arbeit', '#2563eb', 'briefcase', true),
  ('Familie', '#ec4899', 'heart', true),
  ('Reise', '#0ea5e9', 'plane', true),
  ('Telefon', '#f59e0b', 'phone', true),
  ('Finanzen', '#10b981', 'wallet', true),
  ('Termine', '#06b6d4', 'calendar', true),
  ('Einkaufen', '#f97316', 'shopping-cart', true),
  ('Wichtig', '#ef4444', 'alert-triangle', true)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  v_trip_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM trips WHERE name = 'Namibia-Reise') THEN
    INSERT INTO trips (name, destination, notes, contact_person, contact_phone, booking_links)
    VALUES (
      'Namibia-Reise',
      'Windhoek, Namibia',
      'Rundreise mit Mietwagen ab Windhoek. Visum bei Einreise. Gelbfieberimpfung nicht erforderlich.',
      'Reisebüro Weltweit',
      '+49 89 1234567',
      'https://booking-beispiel.example/namibia'
    )
    RETURNING id INTO v_trip_id;

    INSERT INTO trip_segments (
      trip_id, segment_type, title, from_location, to_location,
      departure_date, departure_time, arrival_date, arrival_time,
      airline, flight_number, booking_number, terminal, gate, seat, baggage_info, order_index
    ) VALUES (
      v_trip_id, 'flug', 'Hinflug 1. Etappe', 'München (MUC)', 'Addis Abeba (ADD)',
      '2026-09-15', '22:30', '2026-09-16', '06:10',
      'Ethiopian Airlines', 'ET606', 'BK-NAM-2026-001', '2', 'B14', '23A', '1 x 23kg', 1
    );

    INSERT INTO trip_segments (
      trip_id, segment_type, title, from_location, to_location,
      departure_date, departure_time, arrival_date, arrival_time,
      airline, flight_number, booking_number, terminal, gate, seat, baggage_info, order_index
    ) VALUES (
      v_trip_id, 'flug', 'Weiterflug nach Windhoek', 'Addis Abeba (ADD)', 'Windhoek (WDH)',
      '2026-09-16', '08:00', '2026-09-16', '11:45',
      'Ethiopian Airlines', 'ET806', 'BK-NAM-2026-001', '1', 'C3', '14C', 'Durchgehend eingecheckt', 2
    );

    INSERT INTO trip_segments (
      trip_id, segment_type, title, from_location, to_location,
      departure_date, departure_time, arrival_date, arrival_time,
      airline, flight_number, booking_number, terminal, gate, seat, baggage_info, order_index
    ) VALUES (
      v_trip_id, 'mietwagen', 'Mietwagen Windhoek Flughafen', 'Windhoek Flughafen', NULL,
      '2026-09-16', '12:30', '2026-09-30', '18:00',
      NULL, NULL, 'CAR-88213', NULL, NULL, NULL, '4x4 Geländewagen, Vollkasko', 3
    );

    INSERT INTO trip_segments (
      trip_id, segment_type, title, from_location, to_location,
      departure_date, departure_time, arrival_date, arrival_time,
      airline, flight_number, booking_number, terminal, gate, seat, baggage_info, order_index
    ) VALUES (
      v_trip_id, 'hotel', 'Hotel Windhoek (Ankunft)', NULL, NULL,
      '2026-09-16', '14:00', '2026-09-18', '11:00',
      NULL, NULL, 'HTL-9931', NULL, NULL, NULL, NULL, 4
    );
  END IF;
END $$;

DO $$
DECLARE
  v_cat_telefon uuid;
  v_cat_reise uuid;
  v_cat_familie uuid;
  v_cat_finanzen uuid;
  v_cat_wichtig uuid;
  v_cat_arbeit uuid;
  v_cat_privat uuid;
  v_trip_namibia uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tasks LIMIT 1) THEN
    SELECT id INTO v_cat_telefon FROM categories WHERE name = 'Telefon';
    SELECT id INTO v_cat_reise FROM categories WHERE name = 'Reise';
    SELECT id INTO v_cat_familie FROM categories WHERE name = 'Familie';
    SELECT id INTO v_cat_finanzen FROM categories WHERE name = 'Finanzen';
    SELECT id INTO v_cat_wichtig FROM categories WHERE name = 'Wichtig';
    SELECT id INTO v_cat_arbeit FROM categories WHERE name = 'Arbeit';
    SELECT id INTO v_cat_privat FROM categories WHERE name = 'Privat';
    SELECT id INTO v_trip_namibia FROM trips WHERE name = 'Namibia-Reise';

    INSERT INTO tasks (title, description, due_date, due_time, priority, category_id, status, reminder_offset)
    VALUES ('Zahnarzt anrufen', NULL, CURRENT_DATE + 1, '10:00', 'normal', v_cat_telefon, 'offen', '1h');

    INSERT INTO tasks (title, description, due_date, priority, category_id, status, reminder_offset, trip_id)
    VALUES ('Koffer packen', NULL, CURRENT_DATE + 6, 'normal', v_cat_reise, 'offen', '1d', v_trip_namibia);

    INSERT INTO tasks (title, description, due_date, priority, category_id, status, reminder_offset)
    VALUES ('Mutter anrufen', NULL, '2026-08-25', 'normal', v_cat_familie, 'offen', 'at_time');

    INSERT INTO tasks (title, description, due_date, priority, category_id, status, reminder_offset)
    VALUES ('Rechnung für Versicherung bezahlen', 'Wichtig, nicht vergessen.', CURRENT_DATE + 2, 'hoch', v_cat_finanzen, 'offen', '1d');

    INSERT INTO tasks (title, description, due_date, due_time, priority, category_id, status, reminder_offset, trip_id)
    VALUES ('Ethiopian Airlines wegen Sitzplätzen anrufen', 'Sitzplätze für den Namibia-Flug klären.', '2026-09-03', '14:00', 'hoch', v_cat_reise, 'offen', '2h', v_trip_namibia);

    INSERT INTO tasks (title, description, due_date, priority, category_id, status, reminder_offset)
    VALUES ('Reisepass verlängern', 'Läuft in wenigen Monaten ab.', CURRENT_DATE - 7, 'hoch', v_cat_wichtig, 'offen', 'none');

    INSERT INTO tasks (title, description, due_date, priority, category_id, status, reminder_offset)
    VALUES ('Präsentation für Teammeeting vorbereiten', NULL, CURRENT_DATE, 'normal', v_cat_arbeit, 'offen', 'none');

    INSERT INTO tasks (title, description, due_date, priority, category_id, status, reminder_offset, trip_id, is_suggested)
    VALUES ('Online-Check-in für Namibia-Flug durchführen', NULL, '2026-09-14', 'hoch', v_cat_reise, 'offen', '1d', v_trip_namibia, true);

    INSERT INTO tasks (title, description, due_date, priority, category_id, status, reminder_offset)
    VALUES ('Wohnung putzen', NULL, CURRENT_DATE - 2, 'niedrig', v_cat_privat, 'erledigt', 'none');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM contacts LIMIT 1) THEN
    INSERT INTO contacts (name, organization, phone, phone_alt, email, category, notes) VALUES
      ('Dr. Müller', 'Zahnarztpraxis Müller', '+49 89 5551234', NULL, 'praxis@mueller-zahn.example', 'Telefon', 'Termine bevorzugt vormittags'),
      ('Mutter', NULL, '+49 171 2223344', NULL, NULL, 'Familie', NULL),
      ('Ethiopian Airlines Kundenservice', 'Ethiopian Airlines', '+49 69 299530', '+251 11 665 6000', 'support@ethiopianairlines.example', 'Reise', 'Für Sitzplatz- und Buchungsanfragen'),
      ('Versicherung ABC', 'ABC Versicherung AG', '+49 800 1112222', NULL, 'service@abc-versicherung.example', 'Finanzen', 'Vertragsnummer: 88213-NX');
  END IF;
END $$;
