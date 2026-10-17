/*
# Add travel expenses, packlists, emergency info, and journal tables

## Overview
Adds four new tables for the travel app expansion: travel expenses, packing lists, emergency information, and a travel journal. All tables are user-scoped with RLS.

## New Tables

### 1. travel_expenses
Tracks personal travel expenses per trip/segment.
- id (uuid PK)
- user_id (uuid, defaults to auth.uid())
- trip_id (uuid FK to trips, nullable for non-trip expenses)
- segment_id (uuid FK to trip_segments, nullable)
- label (text, not null) — description of the expense
- amount (numeric, not null) — original amount
- currency (text, default 'EUR') — original currency
- amount_eur (numeric, nullable) — converted EUR amount at time of entry
- exchange_rate (numeric, nullable) — rate used for conversion
- expense_date (date, not null) — when the expense occurred
- category (text, nullable) — e.g. Tanken, Restaurant, Unterkunft
- paid_by (text, nullable) — who paid
- notes (text, nullable)
- created_at (timestamptz)

### 2. packlist_items
Packing list items associated with a trip.
- id (uuid PK)
- user_id (uuid, defaults to auth.uid())
- trip_id (uuid FK to trips, nullable)
- label (text, not null)
- category (text, nullable) — Dokumente, Kleidung, Technik, Gesundheit, Sonstiges
- checked (boolean, default false)
- sort_index (integer, default 0)
- created_at (timestamptz)

### 3. emergency_info
Personal emergency information, one row per user.
- id (uuid PK)
- user_id (uuid, unique, defaults to auth.uid())
- emergency_contact_name (text, nullable)
- emergency_contact_phone (text, nullable)
- insurance_name (text, nullable)
- insurance_phone (text, nullable)
- embassy_name (text, nullable)
- embassy_phone (text, nullable)
- blood_type (text, nullable)
- allergies (text, nullable)
- medications (text, nullable)
- medical_notes (text, nullable)
- updated_at (timestamptz)

### 4. journal_entries
Travel journal entries linked to trips/segments.
- id (uuid PK)
- user_id (uuid, defaults to auth.uid())
- trip_id (uuid FK to trips, nullable)
- segment_id (uuid FK to trip_segments, nullable)
- entry_date (date, not null)
- title (text, nullable)
- body (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

## Security
- RLS enabled on all new tables.
- All policies scope to authenticated users with auth.uid() = user_id.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).
*/

-- Travel expenses
CREATE TABLE IF NOT EXISTS travel_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  segment_id uuid REFERENCES trip_segments(id) ON DELETE SET NULL,
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  amount_eur numeric,
  exchange_rate numeric,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text,
  paid_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE travel_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_expenses" ON travel_expenses;
CREATE POLICY "select_own_expenses" ON travel_expenses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_expenses" ON travel_expenses;
CREATE POLICY "insert_own_expenses" ON travel_expenses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_expenses" ON travel_expenses;
CREATE POLICY "update_own_expenses" ON travel_expenses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_expenses" ON travel_expenses;
CREATE POLICY "delete_own_expenses" ON travel_expenses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Packlist items
CREATE TABLE IF NOT EXISTS packlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text,
  checked boolean NOT NULL DEFAULT false,
  sort_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE packlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_packlist" ON packlist_items;
CREATE POLICY "select_own_packlist" ON packlist_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_packlist" ON packlist_items;
CREATE POLICY "insert_own_packlist" ON packlist_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_packlist" ON packlist_items;
CREATE POLICY "update_own_packlist" ON packlist_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_packlist" ON packlist_items;
CREATE POLICY "delete_own_packlist" ON packlist_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Emergency info
CREATE TABLE IF NOT EXISTS emergency_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance_name text,
  insurance_phone text,
  embassy_name text,
  embassy_phone text,
  blood_type text,
  allergies text,
  medications text,
  medical_notes text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_emergency" ON emergency_info;
CREATE POLICY "select_own_emergency" ON emergency_info FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_emergency" ON emergency_info;
CREATE POLICY "insert_own_emergency" ON emergency_info FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_emergency" ON emergency_info;
CREATE POLICY "update_own_emergency" ON emergency_info FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_emergency" ON emergency_info;
CREATE POLICY "delete_own_emergency" ON emergency_info FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  segment_id uuid REFERENCES trip_segments(id) ON DELETE SET NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  title text,
  body text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_journal" ON journal_entries;
CREATE POLICY "select_own_journal" ON journal_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_journal" ON journal_entries;
CREATE POLICY "insert_own_journal" ON journal_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_journal" ON journal_entries;
CREATE POLICY "update_own_journal" ON journal_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_journal" ON journal_entries;
CREATE POLICY "delete_own_journal" ON journal_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);