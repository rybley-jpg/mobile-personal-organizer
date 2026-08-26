/*
# Add price column to trip_segments and create travel_checklists table

## 1. trip_segments: Add price columns
- `price_amount` (numeric, nullable): The cost of this segment (flight, hotel, car, etc.)
- `price_currency` (text, default 'EUR'): The currency code for the price

## 2. New table: travel_checklists
- Stores travel checklist items per trip
- Each item has a label, checked status, and whether it's a custom item
- Predefined items can be seeded by the app

## 3. New table: wallet_documents
- Stores metadata for locally-stored travel documents (photos/PDFs)
- The actual files are stored ONLY on the Android device's private app storage
- This table only holds the file path, name, type, and associated trip

## Security
- All tables use the existing user isolation pattern (user_id with auth.uid() checks)
- RLS enabled on all new tables
- Owner-scoped CRUD policies for authenticated users
*/

-- Add price columns to trip_segments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'price_amount') THEN
    ALTER TABLE trip_segments ADD COLUMN price_amount numeric(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'price_currency') THEN
    ALTER TABLE trip_segments ADD COLUMN price_currency text DEFAULT 'EUR';
  END IF;
END $$;

-- Create travel_checklists table
CREATE TABLE IF NOT EXISTS travel_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  is_custom boolean NOT NULL DEFAULT false,
  sort_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE travel_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_checklists" ON travel_checklists;
CREATE POLICY "select_own_checklists" ON travel_checklists FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_checklists" ON travel_checklists;
CREATE POLICY "insert_own_checklists" ON travel_checklists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_checklists" ON travel_checklists;
CREATE POLICY "update_own_checklists" ON travel_checklists FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_checklists" ON travel_checklists;
CREATE POLICY "delete_own_checklists" ON travel_checklists FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_travel_checklists_trip ON travel_checklists(trip_id);

-- Create wallet_documents table (metadata only — files stored locally on device)
CREATE TABLE IF NOT EXISTS wallet_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  doc_type text NOT NULL DEFAULT 'sonstiges',
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wallet_docs" ON wallet_documents;
CREATE POLICY "select_own_wallet_docs" ON wallet_documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wallet_docs" ON wallet_documents;
CREATE POLICY "insert_own_wallet_docs" ON wallet_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_wallet_docs" ON wallet_documents;
CREATE POLICY "update_own_wallet_docs" ON wallet_documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_wallet_docs" ON wallet_documents;
CREATE POLICY "delete_own_wallet_docs" ON wallet_documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_documents_trip ON wallet_documents(trip_id);
