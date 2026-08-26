/*
# Add task checklist and flight notification tables

1. New Tables
- `task_checklist`
  - `id` (uuid, primary key)
  - `task_id` (uuid, foreign key to tasks.id, ON DELETE CASCADE)
  - `text` (text, not null) — the checklist item text
  - `checked` (boolean, default false) — whether the item is done
  - `order_index` (int, default 0) — ordering within the task
  - `created_at` (timestamptz)
- `flight_notifications`
  - `id` (uuid, primary key)
  - `segment_id` (uuid, foreign key to trip_segments.id, ON DELETE CASCADE)
  - `notification_type` (text) — e.g. 'gate_change', 'delay', 'boarding', 'cancellation', 'general'
  - `message` (text, not null) — the notification message
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz)
2. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD (single-tenant, no auth).
3. Notes
- Checklist items are ordered within a task and can be toggled checked/unchecked.
- Flight notifications are linked to a trip segment and track read/unread state.
*/

CREATE TABLE IF NOT EXISTS task_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_task_checklist" ON task_checklist;
CREATE POLICY "anon_select_task_checklist" ON task_checklist FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_task_checklist" ON task_checklist;
CREATE POLICY "anon_insert_task_checklist" ON task_checklist FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_task_checklist" ON task_checklist;
CREATE POLICY "anon_update_task_checklist" ON task_checklist FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_task_checklist" ON task_checklist;
CREATE POLICY "anon_delete_task_checklist" ON task_checklist FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS flight_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES trip_segments(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flight_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_flight_notifications" ON flight_notifications;
CREATE POLICY "anon_select_flight_notifications" ON flight_notifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_flight_notifications" ON flight_notifications;
CREATE POLICY "anon_insert_flight_notifications" ON flight_notifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_flight_notifications" ON flight_notifications;
CREATE POLICY "anon_update_flight_notifications" ON flight_notifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_flight_notifications" ON flight_notifications;
CREATE POLICY "anon_delete_flight_notifications" ON flight_notifications FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_task_checklist_task_id ON task_checklist(task_id);
CREATE INDEX IF NOT EXISTS idx_flight_notifications_segment_id ON flight_notifications(segment_id);
