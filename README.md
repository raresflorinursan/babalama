# Solvix

Solvix ist eine deutschsprachige Plattform fuer Coding, KI und Software-Projekte.
Der zentrale Produkt-Loop verbindet Lernen, Bauen, Community-Feedback und ein
wachsendes Builder-Portfolio:

```text
Lernen -> Projekt bauen -> Feedback bekommen -> Profil erweitern
```

## Technischer Stack

- React 19 und TypeScript
- TanStack Start, Router und Query
- Vite 7 und Tailwind CSS 4
- Supabase Auth, Postgres und Storage
- Vercel Deployment
- Vitest, Testing Library, Playwright und Axe

## Projektstruktur

- `src/routes`: Seiten und geschuetzte Routen
- `src/components`: Layout, Projektkomponenten und UI-Bausteine
- `src/integrations/supabase`: Browser-, Server- und Auth-Anbindung
- `src/lib`: Validierung, Sicherheitsregeln und Hilfsfunktionen
- `supabase/migrations`: reproduzierbare Datenbank- und RLS-Aenderungen
- `tests/e2e`: Browser-, Mobil- und WCAG-Tests
- `docs`: Release-, Sicherheits- und Supabase-Dokumentation
- `public`: oeffentliche statische Dateien

## Lokale Einrichtung

Voraussetzungen: Node.js 24 und npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Die Anwendung benoetigt mindestens diese Werte:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` darf nur in einer vertrauenswuerdigen Serverumgebung
gesetzt werden. Der Wert gehoert niemals in Browser-Code, Screenshots oder Git.

## Qualitaetspruefungen

```bash
npm run lint
npm run test:run
npm run test:e2e
npm run test:coverage
npm run build
npm audit
```

Die Browser-Suite prueft Desktop und Mobil, geschuetzte Routen, Fehlerseiten,
Tastaturnavigation, horizontalen Overflow und automatisch erkennbare WCAG-A/AA-Verstoesse.

## Supabase

Schemaaenderungen werden ausschliesslich als versionierte SQL-Dateien unter
`supabase/migrations` gespeichert. Neue oeffentliche Tabellen erhalten keine
automatischen Data-API-Rechte. Eine Migration muss daher explizite `GRANT`s,
aktiviertes RLS, passende Policies und die zugehoerigen Tests gemeinsam enthalten.

Der aktuelle Projekt- und Sicherheitsstand ist dokumentiert in:

- `docs/SUPABASE_APPLY_STEPS.md`
- `docs/SUPABASE_QUERIES_APPLIED.md`
- `docs/RELEASE_VERIFICATION.md`

## Deployment

Pushes auf `main` werden durch das verbundene Vercel-Projekt gebaut. Vor einem
Release muessen Lint, Unit-Tests, Browser-Tests, Produktions-Build, Supabase-Advisor
und die Live-Smoke-Tests erfolgreich sein.

Die verbindliche Aufgabenliste liegt in `docs/SOLVIX_RELEASE_CHECKLIST.md`.
