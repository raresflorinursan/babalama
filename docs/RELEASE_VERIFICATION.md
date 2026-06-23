# Solvix Release Verification

Stand: 23. Juni 2026

Dieses Dokument haelt die technischen Nachweise fuer den aktuellen Release-Kandidaten fest.

## Anwendung

- Produktions-Build wird fuer das Vercel-Preset erzeugt.
- Der groesste Client-Chunk wurde von rund 607 kB auf rund 398 kB reduziert.
- Supabase ist als eigener, langfristig cachebarer Vendor-Chunk gebuendelt.
- TanStack Query verwendet ein 30-Sekunden-Freshness-Fenster und vermeidet Refetches bei jedem Fensterfokus.
- Projekte koennen erstellt, bearbeitet und vom Eigentuemer nach Bestaetigung geloescht werden.
- Fehler- und Ladeanzeigen sind fuer Projekt, Dashboard und Moderation vorhanden.

## Automatisierte Tests

- Unit-Tests fuer URLs, Fehlerseite, Passwortregeln, reservierte Namen und Projektformulare
- Browser-Smoke-Tests fuer Startseite, Lernen, Auth, geschuetzte Projekt- und Admin-Routen
- Desktop- und Mobiltests
- Tastaturtest fuer den Sprung zum Hauptinhalt
- WCAG-A/AA-Scans fuer Startseite, Lernen, Community und Auth
- horizontaler Overflow-Test fuer die mobile Navigation
- 31 Unit-Tests und 23 erfolgreiche Browser-Tests; ein Desktop-Test ist bewusst nur im Mobilprojekt aktiv

Verbindliche Befehle vor jedem Release:

```bash
npm run lint
npx tsc --noEmit
npm run test:run
npm run test:e2e
npm run build
npm audit --audit-level=moderate
```

## Live-Supabase-Audit

Projekt: `ckmdhrrcevyswacszbrf`

Am 23. Juni 2026 live verifiziert:

- alle 18 Solvix-Tabellen haben RLS aktiviert
- alle 18 Solvix-Tabellen erzwingen RLS
- jede oeffentliche Tabelle besitzt mindestens eine Policy
- `app_private.platform_admins` hat keine Client-Tabellenrechte
- keine `SECURITY DEFINER`-Funktion im `public`-Schema ist fuer Clients ausfuehrbar
- genau ein Owner ist registriert und das zugehoerige Profil stimmt mit der privaten Admin-Tabelle ueberein
- Avatar- und Projektbild-Buckets sind auf 5 MB begrenzt
- neue `postgres`-Objekte erhalten keine automatischen Data-API-Rechte
- Projekte, Fragen, Antworten und Kommentare besitzen eindeutige Fremdschluessel zu `profiles`
- die daraus generierten Supabase-Typen bestehen die TypeScript-Pruefung ohne Fehler

Aktuellster Live-Migrationsstand:

```text
20260623162424_add_profile_author_relationships
```

## Bekannte Hinweise

- `app_private.platform_admins` hat absichtlich keine RLS-Policy. Die private Tabelle ist fuer Clients vollstaendig gesperrt und nur ueber kontrollierte Sicherheitsfunktionen erreichbar.
- Supabase meldet den Schutz gegen geleakte Passwoerter als deaktiviert. Diese Funktion ist im aktuellen Tarif nicht verfuegbar.
- Der Performance Advisor meldet unbenutzte Indizes. Die Plattform hat noch zu wenig Echtdaten und Traffic, um Indizes fachlich sicher zu entfernen.
- `npm audit` meldet eine niedrige transitive `esbuild`-Warnung fuer den lokalen Windows-Entwicklungsserver. Vite 7.3.5 erlaubt noch keine gepatchte Version; Produktionscode und der macOS-/Vercel-Betrieb sind nicht betroffen. Ein inkompatibles Override wird nicht erzwungen.
- Rechtliche Texte und reale Beta-Nutzertests sind keine automatisierbaren technischen Aufgaben.

## Manueller Release-Sign-off

- Google-Login mit einem echten Google-Konto testen
- E-Mail-Registrierung, Bestaetigung und Passwort-Reset testen
- Vercel Production Environment Variables vergleichen
- Impressum, Datenschutz und Nutzungsbedingungen freigeben
- nach dem GitHub-Push das Vercel-Deployment und zentrale Live-Routen pruefen
