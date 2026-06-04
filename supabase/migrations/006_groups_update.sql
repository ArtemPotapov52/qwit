-- Add category column to groups
alter table public.groups add column if not exists category text not null default 'home';

-- Allow users to insert themselves into group_members
create policy "group_members: insert self" on public.group_members
  for insert with check (user_id = auth.uid());

-- Allow reading profiles of co-members (users sharing at least one group)
create policy "profiles: co-member read" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
        and gm2.user_id = profiles.id
    )
  );

-- Update handle_new_user trigger to also store email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;
