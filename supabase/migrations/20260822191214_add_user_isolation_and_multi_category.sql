/*
# Per-User Data Isolation + Multiple Categories per Task

Die App wird von einer Einzelnutzer-App mit geteilten Daten zu einer
Mehrbenutzer-App: Jede Person, die sich einloggt, sieht nur ihre eigenen
Daten. Keine Synchronisation zwischen verschiedenen Nutzern.

1. user_id Spalten auf: categories, trips, tasks, contacts, task_checklist, flight_notifications
2. Neue Tabelle: task_categories (Junction für mehrere Kategorien pro Aufgabe)
3. RLS Policies umgestellt von anon/public auf authenticated mit auth.uid() = user_id
4. Bestehende Beispieldaten gelöscht (gehören keinem Nutzer)
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'user_id') THEN
    ALTER TABLE categories ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'user_id') THEN
    ALTER TABLE trips ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'user_id') THEN
    ALTER TABLE tasks ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'user_id') THEN
    ALTER TABLE contacts ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_checklist' AND column_name = 'user_id') THEN
    ALTER TABLE task_checklist ADD COLUMN user_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flight_notifications' AND column_name = 'user_id') THEN
    ALTER TABLE flight_notifications ADD COLUMN user_id uuid;
  END IF;
END $$;

DELETE FROM task_checklist WHERE user_id IS NULL;
DELETE FROM flight_notifications WHERE user_id IS NULL;
DELETE FROM tasks WHERE user_id IS NULL;
DELETE FROM trip_segments WHERE trip_id IN (SELECT id FROM trips WHERE user_id IS NULL);
DELETE FROM contacts WHERE user_id IS NULL;
DELETE FROM trips WHERE user_id IS NULL;
DELETE FROM categories WHERE user_id IS NULL;

ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE trips ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE trips ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE contacts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE task_checklist ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE task_checklist ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE flight_notifications ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE flight_notifications ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE TABLE IF NOT EXISTS task_categories (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (task_id, category_id)
);

ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_task_id ON task_categories(task_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_category_id ON task_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_task_checklist_user_id ON task_checklist(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_notifications_user_id ON flight_notifications(user_id);

-- categories
DROP POLICY IF EXISTS "anon_select_categories" ON categories;
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;

CREATE POLICY "select_own_categories" ON categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- trips
DROP POLICY IF EXISTS "anon_select_trips" ON trips;
DROP POLICY IF EXISTS "anon_insert_trips" ON trips;
DROP POLICY IF EXISTS "anon_update_trips" ON trips;
DROP POLICY IF EXISTS "anon_delete_trips" ON trips;

CREATE POLICY "select_own_trips" ON trips FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_trips" ON trips FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_trips" ON trips FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_trips" ON trips FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- trip_segments
DROP POLICY IF EXISTS "anon_select_trip_segments" ON trip_segments;
DROP POLICY IF EXISTS "anon_insert_trip_segments" ON trip_segments;
DROP POLICY IF EXISTS "anon_update_trip_segments" ON trip_segments;
DROP POLICY IF EXISTS "anon_delete_trip_segments" ON trip_segments;

CREATE POLICY "select_own_trip_segments" ON trip_segments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_segments.trip_id AND trips.user_id = auth.uid())
  );
CREATE POLICY "insert_own_trip_segments" ON trip_segments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_segments.trip_id AND trips.user_id = auth.uid())
  );
CREATE POLICY "update_own_trip_segments" ON trip_segments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_segments.trip_id AND trips.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_segments.trip_id AND trips.user_id = auth.uid())
  );
CREATE POLICY "delete_own_trip_segments" ON trip_segments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_segments.trip_id AND trips.user_id = auth.uid())
  );

-- tasks
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;

CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- contacts
DROP POLICY IF EXISTS "anon_select_contacts" ON contacts;
DROP POLICY IF EXISTS "anon_insert_contacts" ON contacts;
DROP POLICY IF EXISTS "anon_update_contacts" ON contacts;
DROP POLICY IF EXISTS "anon_delete_contacts" ON contacts;

CREATE POLICY "select_own_contacts" ON contacts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_contacts" ON contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_contacts" ON contacts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_contacts" ON contacts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- task_categories
CREATE POLICY "select_own_task_categories" ON task_categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_task_categories" ON task_categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_task_categories" ON task_categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- task_checklist
DROP POLICY IF EXISTS "anon_select_task_checklist" ON task_checklist;
DROP POLICY IF EXISTS "anon_insert_task_checklist" ON task_checklist;
DROP POLICY IF EXISTS "anon_update_task_checklist" ON task_checklist;
DROP POLICY IF EXISTS "anon_delete_task_checklist" ON task_checklist;

CREATE POLICY "select_own_task_checklist" ON task_checklist FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_task_checklist" ON task_checklist FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_task_checklist" ON task_checklist FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_task_checklist" ON task_checklist FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- flight_notifications
DROP POLICY IF EXISTS "anon_select_flight_notifications" ON flight_notifications;
DROP POLICY IF EXISTS "anon_insert_flight_notifications" ON flight_notifications;
DROP POLICY IF EXISTS "anon_update_flight_notifications" ON flight_notifications;
DROP POLICY IF EXISTS "anon_delete_flight_notifications" ON flight_notifications;

CREATE POLICY "select_own_flight_notifications" ON flight_notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_flight_notifications" ON flight_notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_flight_notifications" ON flight_notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_flight_notifications" ON flight_notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
