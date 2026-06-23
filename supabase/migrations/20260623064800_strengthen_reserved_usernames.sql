-- Keep Solvix brand/admin names reserved even when Unicode lookalikes,
-- diacritics, separators, repeated letters, or common leetspeak are used.

create or replace function app_private.normalize_username(input_username text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      translate(
        translate(
          lower(coalesce(input_username, '')),
          'áàâäãåéèêëíìîïóòôöõúùûüýÿ',
          'aaaaaaeeeeiiiiooooouuuuyy'
        ),
        'аеіӏорсхуѕ',
        'aeilopcxys'
      ),
      '[^a-z0-9_]+',
      '',
      'g'
    ),
    ''
  );
$$;

create or replace function app_private.username_is_reserved(input_username text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized text := app_private.normalize_username(input_username);
  brand_key text;
  compact_key text;
begin
  if normalized is null then
    return false;
  end if;

  brand_key := replace(normalized, '_', '');
  compact_key := regexp_replace(brand_key, '(.)\1+', '\1', 'g');

  return normalized in (
    'admin',
    'administrator',
    'ceo',
    'founder',
    'moderator',
    'official',
    'solvix',
    'solvix_ceo',
    'solvixceo',
    'support',
    'team'
  )
  or brand_key like '%solvix%'
  or brand_key like '%sovix%'
  or compact_key like '%solvix%'
  or compact_key like '%sovix%'
  or brand_key ~ '[s5][o0][l1]v[i1]x'
  or brand_key ~ '[s5][o0]v[i1]x'
  or compact_key ~ '[s5][o0][l1]v[i1]x'
  or compact_key ~ '[s5][o0]v[i1]x';
end;
$$;

-- Existing non-admin profiles that only became reserved through the stronger
-- normalization receive a deterministic neutral username.
update public.profiles as profile
set username = app_private.safe_profile_username(
  'creator_' || replace(left(profile.id::text, 8), '-', ''),
  profile.id
)
where app_private.username_is_reserved(profile.username)
  and not app_private.is_platform_admin(profile.id);

revoke execute on function app_private.normalize_username(text)
  from public, anon, authenticated;
revoke execute on function app_private.username_is_reserved(text)
  from public, anon, authenticated;
