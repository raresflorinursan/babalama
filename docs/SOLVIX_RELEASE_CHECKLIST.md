# Solvix Release Checklist

Diese Liste ist die feste Arbeitsgrundlage fuer die Veroeffentlichung. Wenn neue Punkte dazukommen, wird hier geprueft: erledigt, teilweise erledigt oder offen.

## Kernidee

Solvix soll nicht nur eine weitere Coding-Community sein. Der zentrale Produkt-Loop ist:

Lernen -> Projekt bauen -> Community-Feedback bekommen -> Profil/Portfolio waechst automatisch.

## Phase 1: Stabilisierung

Status: In Arbeit

- [ ] Google Login final testen
- [ ] E-Mail Login und Registrierung final testen
- [ ] Automatische Profil-Erstellung nach Registrierung pruefen
- [x] Auth-Profil-Sicherung im Code einbauen
- [x] Supabase-Projekt final vereinheitlichen
- [ ] Vercel Environment Variables final pruefen
- [ ] Build und Deployment nach jeder Kern-Aenderung pruefen

## Phase 2: Echtdaten statt Mock-Daten

Status: In Arbeit

- [x] Projekte werden aus Supabase geladen
- [x] Fragen werden aus Supabase geladen
- [x] Projekt-Upload speichert in Supabase
- [x] Fragen-Erstellung speichert in Supabase
- [x] Lernfortschritt als Supabase-Tabelle vorbereitet
- [x] Lernfortschritt-Migration in der Live-Datenbank anwenden
- [x] Community-Posts von Mock-Daten auf Supabase umstellen
- [x] Community-Likes auf Supabase umstellen
- [x] Community-Kommentare auf Supabase umstellen
- [ ] Meetings entweder als Beta markieren oder in Supabase speichern

## Phase 3: Solvix-Loop

Status: Offen

- [ ] Jede Lektion bekommt eine passende Projektaufgabe
- [ ] Projektideen sind direkt mit Lernmodulen verbunden
- [ ] Projekt-Upload speichert Lernziel, Tech-Stack, Schwierigkeit und Erkenntnisse
- [ ] Profil zeigt abgeschlossene Module
- [ ] Profil zeigt veroeffentlichte Projekte
- [ ] Profil zeigt Skills, Badges und Community-Aktivitaet

## Phase 4: Admin und Safety

Status: In Arbeit

- [x] Reservierte Namen wie Solvix, SolvixCEO und aehnliche Schreibweisen vorbereitet
- [x] Private Admin-Tabelle vorbereitet
- [x] Community-Posts auf menschliche Quelle beschraenkt
- [x] Basis-Rate-Limits fuer Community-Posts vorbereitet
- [x] RLS und Rate-Limits fuer Community-Kommentare und Likes eingerichtet
- [x] Service Role Key wird nicht im Frontend importiert
- [x] Supabase Release-Hardening-Migration erstellt
- [x] Härtungs-Migration in Supabase anwenden
- [x] Storage-Buckets fuer Avatare und Projektbilder absichern
- [ ] Admin-Moderationsoberflaeche bauen
- [ ] Melden-Funktion in Supabase speichern
- [ ] Nutzer blockieren/ignorieren in Supabase speichern
- [ ] Admin-Rechte live fuer den echten CEO-Account verifizieren

## Phase 5: Public Beta

Status: Offen

- [ ] Rechtliches Minimum: Impressum
- [ ] Datenschutzerklaerung
- [ ] Nutzungsbedingungen
- [ ] Cookie-/Tracking-Hinweis pruefen
- [ ] 20-50 Beta-Nutzer testen lassen
- [ ] Feedback sammeln
- [ ] Kritische Bugs fixen

## Was Codex selbststaendig machen kann

- Code umsetzen
- UI/UX verbessern
- Supabase-Migrationen vorbereiten
- RLS-Policies schreiben
- TypeScript-Typen pflegen
- Community, Lernen, Profile, Projekte und Meetings an Supabase anbinden
- Build testen
- Git commits und push vorbereiten

## Wo Nutzerzugriff noetig ist

- Supabase SQL Editor nutzen, wenn der Connector keine Berechtigung hat
- Google OAuth Client ID und Client Secret eintragen
- Vercel Environment Variables setzen oder ersetzen
- Rechtliche Betreiberdaten liefern
- Echten Admin-/CEO-Account bestaetigen
