/*
# Travel folder documents without a trip, plus number, expiry and notes

1. Changed table
- `wallet_documents`
  - `trip_id` is now optional (NULL allowed). Documents such as a passport no longer need a trip.
  - New column `doc_number` (text, optional): document or booking number.
  - New column `expires_on` (date, optional): expiry date, used for the status badge.
  - New column `notes` (text, optional): free text, e.g. emergency number of an insurance.

2. Security
- No change to row level security or grants. Existing owner-only policies (auth.uid() = user_id) stay in place.

3. Important notes
- Existing rows keep their trip assignment; nothing is deleted or rewritten.
- The statements are idempotent and can be re-run safely.
*/

ALTER TABLE wallet_documents ALTER COLUMN trip_id DROP NOT NULL;

ALTER TABLE wallet_documents ADD COLUMN IF NOT EXISTS doc_number text;
ALTER TABLE wallet_documents ADD COLUMN IF NOT EXISTS expires_on date;
ALTER TABLE wallet_documents ADD COLUMN IF NOT EXISTS notes text;
