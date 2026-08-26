# mobile-personal-organizer

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-z3q45f3v)

## Android-App bauen

Dieses Projekt ist mit Capacitor für Android konfiguriert. Die Web-App wird in eine native Android-Hülle verpackt.

### Voraussetzungen

- **Node.js** (ab Version 18)
- **Android Studio** — https://developer.android.com/studio
- Nach der Installation von Android Studio: SDK einrichten (über den SDK-Manager in Android Studio)

### Schritte zum Erstellen der APK

1. **Projekt herunterladen** und entpacken

2. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```

3. **Web-Assets bauen und mit Android synchronisieren:**
   ```bash
   npm run cap:sync
   ```

4. **Android-Projekt in Android Studio öffnen:**
   ```bash
   npm run cap:open
   ```
   Dies öffnet Android Studio mit dem Android-Projekt.

5. **APK erstellen in Android Studio:**
   - Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Warten bis der Build fertig ist
   - APK-Datei liegt danach in `android/app/build/outputs/apk/debug/app-debug.apk`

6. **APK auf dem Handy installieren:**
   - APK-Datei auf das Android-Smartphone übertragen (z. B. per USB, Google Drive oder E-Mail)
   - Auf dem Smartphone die Datei antippen und die Installation erlauben
   - Falls gefragt: "Installation aus unbekannten Quellen" zulassen

### App direkt auf angeschlossenem Handy testen

1. USB-Debugging auf dem Android-Smartphone aktivieren (Entwickleroptionen)
2. Handy per USB mit dem Computer verbinden
3. In Android Studio auf den grünen Play-Button klicken — die App wird direkt auf dem Handy installiert und gestartet

### App im Google Play Store veröffentlichen

Für die Veröffentlichung im Play Store wird eine signierte AAB-Datei benötigt:
- In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**
- Ein Keystore erstellen oder auswählen
- Die fertige `.aab`-Datei im Google Play Console hochladen
