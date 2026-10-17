/*
# Create location_photos table

1. New Tables
- `location_photos`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to authenticated user, references auth.users)
  - `trip_id` (uuid, nullable, references trips ON DELETE SET NULL)
  - `label` (text, nullable — user-provided caption or auto-generated from city)
  - `city_name` (text, nullable — reverse-geocoded city)
  - `country_name` (text, nullable — reverse-geocoded country)
  - `latitude` (double precision, not null — GPS latitude)
  - `longitude` (double precision, not null — GPS longitude)
  - `file_path` (text, not null — Capacitor Filesystem path)
  - `file_name` (text, not null — original file name)
  - `file_type` (text, nullable — MIME type)
  - `created_at` (timestamptz, defaults to now)

2. Security
- Enable RLS on `location_photos`.
- Owner-scoped CRUD: each authenticated user can only access rows they own.
- `user_id` defaults to `auth.uid()` so inserts that omit it still succeed.

3. Index
- Index on `user_id` for fast per-user queries.
- Index on `trip_id` for filtering by trip.
*/

CREATE TABLE IF NOT EXISTS location_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  label text,
  city_name text,
  country_name text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE location_photos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_location_photos_user_id ON location_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_location_photos_trip_id ON location_photos(trip_id);

DROP POLICY IF EXISTS "select_own_location_photos" ON location_photos;
CREATE POLICY "select_own_location_photos" ON location_photos FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_location_photos" ON location_photos;
CREATE POLICY "insert_own_location_photos" ON location_photos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_location_photos" ON location_photos;
CREATE POLICY "update_own_location_photos" ON location_photos FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_location_photos" ON location_photos;
CREATE POLICY "delete_own_location_photos" ON location_photos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
