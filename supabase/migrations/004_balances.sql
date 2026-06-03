-- Вычисленные балансы между парами участников в группе
-- (хранятся денормализованно для быстрого чтения)
create table if not exists public.balances (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups(id) on delete cascade not null,
  from_user  uuid references public.profiles(id) on delete cascade not null,
  to_user    uuid references public.profiles(id) on delete cascade not null,
  amount     numeric(12,2) not null default 0,
  currency   text not null default 'RUB',
  updated_at timestamptz default now() not null,
  unique (group_id, from_user, to_user)
);

alter table public.balances enable row level security;

create policy "balances: group members read" on public.balances
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = balances.group_id and user_id = auth.uid()
    )
  );

-- Функция пересчёта баланса после изменения трат
create or replace function public.recalculate_balances(p_group_id uuid)
returns void language plpgsql security definer as $$
begin
  delete from public.balances where group_id = p_group_id;

  insert into public.balances (group_id, from_user, to_user, amount, currency)
  select
    e.group_id,
    es.user_id   as from_user,
    e.paid_by    as to_user,
    sum(es.amount) as amount,
    e.currency
  from public.expenses e
  join public.expense_splits es on es.expense_id = e.id
  where e.group_id = p_group_id
    and es.user_id <> e.paid_by
    and not es.settled
  group by e.group_id, es.user_id, e.paid_by, e.currency
  having sum(es.amount) > 0;
end;
$$;
