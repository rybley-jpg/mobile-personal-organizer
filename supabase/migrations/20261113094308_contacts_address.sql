/*
# Add address column to contacts

1. Modified Tables
- `contacts`: new column `address` (text, nullable) for a postal address that can be opened in a map.

2. Security
- No changes to RLS policies or grants. Existing owner-scoped policies already cover the new column.

3. Notes
- Idempotent: the column is only added if it does not exist yet.
- No existing data is changed; existing contacts simply have an empty address.
*/

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address text;