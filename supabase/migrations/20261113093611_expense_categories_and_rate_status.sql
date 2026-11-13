/*
# Finanzen: eigene Kategorien und Kursstatus je Ausgabe

1. Neue Tabelle
- `expense_categories`: vom Nutzer selbst angelegte Ausgabenkategorien.
  - `id` (uuid, Primärschlüssel)
  - `user_id` (uuid, Besitzer, wird automatisch auf den angemeldeten Nutzer gesetzt)
  - `name` (text, Pflicht, je Nutzer eindeutig)
  - `created_at` (Zeitstempel)

2. Geänderte Tabelle `travel_expenses`
- `rate_status` (text): 'ok' = Kurs aktuell, 'cached' = zuletzt gespeicherter Kurs (offline), 'missing' = kein Kurs, wird später nachgerechnet.
- `rate_date` (date): Datum des verwendeten Kurses.
- Bestehende Euro-Ausgaben erhalten Betrag in Euro = Betrag und Kurs 1.
- Bestehende Fremdwährungs-Ausgaben ohne Euro-Betrag werden als 'missing' markiert.
- Keine Spalten werden gelöscht oder verändert.

3. Sicherheit
- RLS auf `expense_categories` aktiviert.
- Nur der Besitzer kann seine Kategorien lesen, anlegen, ändern und löschen (je eine Richtlinie pro Aktion).
- Zugriff nur für die Rolle `authenticated`.

# Wichtige Hinweise
1. Die Standardkategorien (Tanken, Essen, Geschenke, Massage, Unterkunft, Transport, Sonstiges) stehen im Programmcode, nicht in der Tabelle.
2. Die Migration ist wiederholbar: Spalten und Tabelle werden nur angelegt, wenn sie fehlen, Richtlinien werden vorher entfernt.
*/

CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expense_categories_user_name_key UNIQUE (user_id, name)
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON expense_categories TO authenticated;

DROP POLICY IF EXISTS "select_own_expense_categories" ON expense_categories;
CREATE POLICY "select_own_expense_categories" ON expense_categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_expense_categories" ON expense_categories;
CREATE POLICY "insert_own_expense_categories" ON expense_categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_expense_categories" ON expense_categories;
CREATE POLICY "update_own_expense_categories" ON expense_categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_expense_categories" ON expense_categories;
CREATE POLICY "delete_own_expense_categories" ON expense_categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER TABLE travel_expenses ADD COLUMN IF NOT EXISTS rate_status text
  CHECK (rate_status IN ('ok', 'cached', 'missing'));
ALTER TABLE travel_expenses ADD COLUMN IF NOT EXISTS rate_date date;

UPDATE travel_expenses
SET amount_eur = amount, exchange_rate = 1
WHERE currency = 'EUR' AND amount_eur IS NULL;

UPDATE travel_expenses
SET rate_status = CASE WHEN amount_eur IS NULL THEN 'missing' ELSE 'ok' END
WHERE rate_status IS NULL;
