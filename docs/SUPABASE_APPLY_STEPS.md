# Supabase Apply Steps

Diese Schritte sind noetig, wenn Codex keinen direkten Supabase-Connector-Zugriff auf das Projekt hat.

## Ziel

Das Live-Supabase-Projekt muss denselben sicheren Datenbankstand bekommen wie der Code im Repository.

## Projekt

Aktuelles Live-Projekt:

```text
ckmdhrrcevyswacszbrf
https://ckmdhrrcevyswacszbrf.supabase.co
```

## Reihenfolge im Supabase SQL Editor

In Supabase oeffnen:

Project -> SQL Editor -> New query

Dann diese Dateien in genau dieser Reihenfolge ausfuehren, falls sie in der Live-Datenbank noch nicht angewendet wurden:

1. `supabase/migrations/20260613092102_b0bc6397-b4a6-461e-912c-0eef765906ee.sql`
2. `supabase/migrations/20260613092143_0992e8d8-3291-431f-8329-f2f842c0e1f6.sql`
3. `supabase/migrations/20260615061001_461c3cf2-2651-4702-ae9b-9f7c4b936877.sql`
4. `supabase/migrations/20260615064946_351698e0-f7a6-4eea-b0c8-7277a1984e45.sql`
5. `supabase/migrations/20260616120000_human_only_security_layer.sql`
6. `supabase/migrations/20260617103000_learning_progress.sql`
7. `supabase/migrations/20260617113000_supabase_release_hardening.sql`

Neuere Migrationen werden ueber den verbundenen Supabase-Connector angewendet und
muessen in der Reihenfolge ihrer Versionsnummer folgen. Der aktuell bestaetigte
Live-Stand endet bei:

```text
20260623162424_add_profile_author_relationships
```

Den aktuellen Stand immer zuerst mit `supabase_migrations.schema_migrations`
beziehungsweise der Migrationsliste im Dashboard vergleichen. Bereits vorhandene
Migrationen nicht erneut manuell ausfuehren.

## Wichtig vor dem Ausfuehren

In `20260616120000_human_only_security_layer.sql` steht aktuell dieser Owner:

```text
a87436d3-f228-4145-8e1d-1426a98c0d50
```

Das muss dein echter Supabase-Auth-User sein. Wenn nicht, vor dem Ausfuehren ersetzen.

## Sicherheitsziel

- Public Tabellen haben RLS.
- Nutzer koennen nur eigene private Daten bearbeiten.
- Community-Posts muessen eingeloggten echten Nutzern gehoeren.
- Community-Posts sind auf 200 Zeichen begrenzt.
- Likes und gespeicherte Projekte sind privat pro Nutzer.
- Projekte, Fragen, Antworten und Kommentare sind eindeutig mit ihrem oeffentlichen Autorenprofil verknuepft.
- Avatare und Projektbilder koennen nur im eigenen User-Ordner geschrieben werden.
- Service Role Key bleibt nur serverseitig.

## Nach dem Ausfuehren pruefen

Im SQL Editor:

```sql
select schemaname, tablename, rowsecurity, forcerowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Erwartung: Solvix-Tabellen haben `rowsecurity = true`.

```sql
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Erwartung: `anon` hat nur dort Lesezugriff, wo Inhalte wirklich oeffentlich sein sollen.

```sql
select policyname, tablename, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Erwartung: Jede Tabelle, die ueber die API erreichbar ist, hat passende Policies.
