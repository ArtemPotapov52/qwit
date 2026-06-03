-- Расходные группы
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  currency    text not null default 'RUB',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table public.groups enable row level security;

-- Участники группы
create table if not exists public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  role       text not null default 'member', -- 'admin' | 'member'
  joined_at  timestamptz default now() not null,
  unique (group_id, user_id)
);

alter table public.group_members enable row level security;

-- Видеть группу могут только её участники
create policy "groups: members read" on public.groups
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = groups.id and user_id = auth.uid()
    )
  );

create policy "groups: members of group read members" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );

create policy "groups: insert own" on public.groups for insert with check (auth.uid() = created_by);
create policy "groups: update admin" on public.groups for update using (
  exists (
    select 1 from public.group_members
    where group_id = groups.id and user_id = auth.uid() and role = 'admin'
  )
);
