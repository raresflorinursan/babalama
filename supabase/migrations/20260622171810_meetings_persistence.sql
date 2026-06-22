-- Private two-person meetings. Only the creator and participant can read a row.

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  participant_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 120),
  meeting_type text not null check (
    meeting_type in ('Code Review', 'Design Review', 'Pair Coding', 'SaaS Feedback', 'AI Planning')
  ),
  starts_at timestamptz not null,
  duration_minutes integer not null check (
    duration_minutes between 15 and 180 and duration_minutes % 15 = 0
  ),
  notes text check (notes is null or length(btrim(notes)) <= 500),
  status text not null default 'scheduled' check (
    status in ('scheduled', 'cancelled', 'completed')
  ),
  meeting_code text not null default lower(left(replace(gen_random_uuid()::text, '-', ''), 16)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_not_with_self check (creator_id <> participant_id),
  constraint meetings_code_unique unique (meeting_code)
);

create index meetings_creator_starts_idx
  on public.meetings (creator_id, starts_at desc);
create index meetings_participant_starts_idx
  on public.meetings (participant_id, starts_at desc);

create or replace function app_private.enforce_meeting_safety()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  open_meeting_count integer;
begin
  if auth.uid() is null or new.creator_id <> auth.uid() then
    raise exception 'Meetings require the authenticated creator.';
  end if;

  if new.creator_id = new.participant_id then
    raise exception 'You cannot create a meeting with yourself.';
  end if;

  if not app_private.current_user_can_interact() then
    raise exception 'This account cannot currently create or change meetings.';
  end if;

  if app_private.users_are_blocked(new.creator_id, new.participant_id) then
    raise exception 'This meeting relationship is not available.';
  end if;

  new.title := btrim(new.title);
  new.notes := nullif(btrim(new.notes), '');

  if tg_op = 'INSERT' then
    if new.starts_at <= now() then
      raise exception 'Meetings must start in the future.';
    end if;

    select count(*) into open_meeting_count
    from public.meetings
    where creator_id = auth.uid()
      and status = 'scheduled'
      and starts_at > now();

    if open_meeting_count >= 20 then
      raise exception 'You can have at most 20 upcoming meetings.';
    end if;
  else
    new.creator_id := old.creator_id;
    new.participant_id := old.participant_id;
    new.meeting_code := old.meeting_code;
    new.created_at := old.created_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function app_private.enforce_meeting_safety() from public, anon, authenticated;

create trigger enforce_meeting_safety
  before insert or update on public.meetings
  for each row execute function app_private.enforce_meeting_safety();

revoke all on public.meetings from anon, authenticated;
grant select, insert, update, delete on public.meetings to authenticated;
grant all on public.meetings to service_role;

alter table public.meetings enable row level security;
alter table public.meetings force row level security;

create policy meetings_select_participants
  on public.meetings
  for select to authenticated
  using (
    creator_id = (select auth.uid())
    or participant_id = (select auth.uid())
  );

create policy meetings_insert_creator
  on public.meetings
  for insert to authenticated
  with check (
    creator_id = (select auth.uid())
    and participant_id <> (select auth.uid())
    and (select app_private.current_user_can_interact())
    and not app_private.users_are_blocked(creator_id, participant_id)
  );

create policy meetings_update_creator
  on public.meetings
  for update to authenticated
  using (creator_id = (select auth.uid()))
  with check (
    creator_id = (select auth.uid())
    and (select app_private.current_user_can_interact())
  );

create policy meetings_delete_creator
  on public.meetings
  for delete to authenticated
  using (creator_id = (select auth.uid()));
