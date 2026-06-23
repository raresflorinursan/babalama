-- New database objects must be exposed to the Data API explicitly.
-- Applied to the live Solvix project as migration 20260623160309.
-- Existing grants and application behavior are intentionally unchanged.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema app_private
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema app_private
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema app_private
  revoke execute on functions from public, anon, authenticated, service_role;
