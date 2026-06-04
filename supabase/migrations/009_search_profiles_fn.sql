-- User search function: ilike on id::text (uuid column doesn't support ilike directly)
create or replace function public.search_profiles(query text)
returns table(id uuid, display_name text)
language sql security definer set search_path = public as $$
  select p.id, p.display_name
  from public.profiles p
  where p.id::text ilike '%' || query || '%'
  limit 5;
$$;
