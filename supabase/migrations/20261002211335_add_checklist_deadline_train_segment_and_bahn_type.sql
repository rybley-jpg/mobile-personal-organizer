/*
# Add checklist deadline, train segment fields, and 'bahn' segment type

1. Changes to travel_checklists
- Add `deadline` column (date, nullable) — optional due date for a checklist item.
  When the deadline is in the past and the item is still unchecked, the dashboard
  will highlight it in red as "overdue".

2. Changes to trip_segments
- Add `train_number` column (text, nullable) — for train segments (ICE, TGV, etc.).
- Add `wagon` column (text, nullable) — wagon/coach number for train segments.
- Add `seat_number` column (text, nullable) — seat number for train segments.
- Add `platform` column (text, nullable) — departure platform for train segments.

3. Segment type
- The `segment_type` column already allows arbitrary text values (no enum constraint),
  so 'bahn' can be used directly without altering the column type.
  This is documented here for clarity; no SQL change needed for the type itself.

4. Security
- No changes to RLS policies. Existing policies on travel_checklists and trip_segments
  already allow owners to CRUD their own rows.
*/

-- travel_checklists: add deadline column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'travel_checklists' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE travel_checklists ADD COLUMN deadline date;
  END IF;
END $$;

-- trip_segments: add train-related columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'train_number'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN train_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'wagon'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN wagon text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'seat_number'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN seat_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trip_segments' AND column_name = 'platform'
  ) THEN
    ALTER TABLE trip_segments ADD COLUMN platform text;
  END IF;
END $$;
