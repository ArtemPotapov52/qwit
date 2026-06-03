-- Траты
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.groups(id) on delete cascade not null,
  paid_by     uuid references public.profiles(id) on delete set null,
  title       text not null,
  amount      numeric(12,2) not null check (amount > 0),
  currency    text not null default 'RUB',
  category    text,
  date        date not null default current_date,
  created_at  timestamptz default now() not null
);

-- Доли участников в трате
create table if not exists public.expense_splits (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid references public.expenses(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  amount      numeric(12,2) not null,
  settled     boolean not null default false,
  unique (expense_id, user_id)
);

alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;

create policy "expenses: group members read" on public.expenses
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id and user_id = auth.uid()
    )
  );

create policy "expenses: group members insert" on public.expenses
  for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id and user_id = auth.uid()
    )
  );

create policy "expense_splits: group members read" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );
