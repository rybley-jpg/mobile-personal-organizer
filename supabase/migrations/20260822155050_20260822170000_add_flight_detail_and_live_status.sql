/*
# Erweiterung der Reiseetappen um detaillierte Flugdaten und Live-Status

## Übersicht
Die bestehende Tabelle `trip_segments` wird nicht-destructiv um zusätzliche
Flugdetail-Felder und Live-Status-Spalten erweitert. Es werden keine Tabellen
gelöscht, keine Spalten umbenannt oder Typen geändert. Alle bestehenden Daten
bleiben vollständig erhalten.

## 1. Neue Spalten an `trip_segments`

Flugdetail-Felder (alle nullable, keine Pflichtfelder):
- `from_airport_code` – IATA-Code des Abflughafens (z. B. FRA)
- `to_airport_code` – IATA-Code des Zielflughafens (z. B. ADD)
- `arrival_terminal` – Terminal am Zielflughafen
- `ticket_number` – Ticketnummer
- `travel_class` – Reiseklasse (Economy/Premium Economy/Business/First)
- `carry_on_baggage` – Handgepäck-Info
- `checked_baggage` – Aufgabegepäck-Info
- `segment_notes` – Notizen zu dieser Etappe

Live-Status-Felder (werden bei API-Updates gesetzt, sonst null):
- `last_flight_status` – Letzter bekannter Status (scheduled/delayed boarding/departed/arrived/cancelled/diverted)
- `last_known_gate` – Zuletzt bekanntes Gate
- `previous_gate` – Vorheriges Gate (für Gate-Wechsel-Erkennung)
- `last_known_terminal` – Zuletzt bekanntes Terminal
- `delay_minutes` – Verspätung in Minuten
- `last_known_departure` – Tatsächliche/erwartete Abflugzeit
- `last_known_arrival` – Tatsächliche/erwartete Ankunftszeit
- `last_flight_update` – Zeitpunkt der letzten API-Aktualisierung
- `gate_changed` – Boolean: Gate hat sich geändert
- `checkin_open` – Boolean: Check-in geöffnet (nur von verlässlicher Quelle)

## 2. Sicherheit
RLS-Policies werden nicht geändert – die bestehenden Policies für `trip_segments`
gelten automatisch auch für die neuen Spalten.

## 3. Wichtige Hinweise
- Alle Spalten sind nullable und haben keinen NOT-NULL-Constraint.
- Keine bestehenden Daten gehen verloren.
- Die Migration ist idempotent (sicher wiederholbar).
*/

-- Flugdetail-Spalten
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'from_airport_code') THEN
    ALTER TABLE trip_segments ADD COLUMN from_airport_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'to_airport_code') THEN
    ALTER TABLE trip_segments ADD COLUMN to_airport_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'arrival_terminal') THEN
    ALTER TABLE trip_segments ADD COLUMN arrival_terminal text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'ticket_number') THEN
    ALTER TABLE trip_segments ADD COLUMN ticket_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'travel_class') THEN
    ALTER TABLE trip_segments ADD COLUMN travel_class text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'carry_on_baggage') THEN
    ALTER TABLE trip_segments ADD COLUMN carry_on_baggage text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'checked_baggage') THEN
    ALTER TABLE trip_segments ADD COLUMN checked_baggage text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'segment_notes') THEN
    ALTER TABLE trip_segments ADD COLUMN segment_notes text;
  END IF;

  -- Live-Status-Spalten
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'last_flight_status') THEN
    ALTER TABLE trip_segments ADD COLUMN last_flight_status text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'last_known_gate') THEN
    ALTER TABLE trip_segments ADD COLUMN last_known_gate text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'previous_gate') THEN
    ALTER TABLE trip_segments ADD COLUMN previous_gate text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'last_known_terminal') THEN
    ALTER TABLE trip_segments ADD COLUMN last_known_terminal text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'delay_minutes') THEN
    ALTER TABLE trip_segments ADD COLUMN delay_minutes integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'last_known_departure') THEN
    ALTER TABLE trip_segments ADD COLUMN last_known_departure timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'last_known_arrival') THEN
    ALTER TABLE trip_segments ADD COLUMN last_known_arrival timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'last_flight_update') THEN
    ALTER TABLE trip_segments ADD COLUMN last_flight_update timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'gate_changed') THEN
    ALTER TABLE trip_segments ADD COLUMN gate_changed boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_segments' AND column_name = 'checkin_open') THEN
    ALTER TABLE trip_segments ADD COLUMN checkin_open boolean NOT NULL DEFAULT false;
  END IF;
END $$;
