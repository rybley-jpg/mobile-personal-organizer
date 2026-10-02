/*
# Add 'bahn' to segment_type CHECK and add train live-status fields

## Overview
This migration does two things:
1. Fixes the CHECK constraint on trip_segments.segment_type to include 'bahn' (train).
   The original migration only allowed 'flug', 'hotel', 'mietwagen', 'sonstiges'.
   Migration #6 added train columns but forgot to update this constraint.
2. Adds live-status columns for train segments (delay, platform changes, etc.),
   mirroring the flight live-status pattern.

## 1. Modified Tables

### trip_segments
- **segment_type CHECK**: dropped old constraint, added new one that includes 'bahn'
- `train_operator` text — Verkehrsunternehmen (e.g. DB Fernverkehr)
- `last_train_status` text — live status: 'on_time' | 'delayed' | 'cancelled' | 'unknown'
- `last_known_platform` text — current platform from live data
- `previous_platform` text — previous platform (for change detection)
- `platform_changed` boolean DEFAULT false — whether platform changed
- `delay_minutes_train` integer — delay in minutes from live data
- `last_train_update` timestamptz — when live data was last fetched

## 2. Security
No security changes. RLS policies already exist on trip_segments (owner-scoped via trips.user_id).
New columns inherit existing policies automatically.

## 3. Notes
- All column additions use IF NOT EXISTS for idempotency.
- No data is lost — only additive changes.
- Existing 'flug', 'hotel', 'mietwagen', 'sonstiges' segments remain valid.
*/

-- Fix the CHECK constraint to include 'bahn'
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'trip_segments_segment_type_check'
  ) THEN
    ALTER TABLE trip_segments DROP CONSTRAINT trip_segments_segment_type_check;
  END IF;
END $$;

-- Add new CHECK constraint with 'bahn' included
ALTER TABLE trip_segments
  ADD CONSTRAINT trip_segments_segment_type_check
  CHECK (segment_type IN ('flug', 'hotel', 'mietwagen', 'bahn', 'sonstiges'));

-- Add train live-status columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'train_operator'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN train_operator text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'last_train_status'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN last_train_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'last_known_platform'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN last_known_platform text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'previous_platform'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN previous_platform text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'platform_changed'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN platform_changed boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'delay_minutes_train'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN delay_minutes_train integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'last_train_update'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN last_train_update timestamptz;
  END IF;
END $$;