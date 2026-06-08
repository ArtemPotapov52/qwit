-- Таблица подтверждённых платежей (СБП и др.)
create table if not exists public.settlements (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid references public.groups(id) on delete cascade not null,
  from_user      uuid references public.profiles(id) on delete set null,
  to_user        uuid references public.profiles(id) on delete set null,
  amount         numeric(12,2) not null check (amount > 0),
  currency       text not null default 'RUB',
  payment_method text not null default 'sbp',
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz default now() not null
);

alter table public.settlements enable row level security;

create policy "settlements: group members read" on public.settlements
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = settlements.group_id and user_id = auth.uid()
    )
  );

create policy "settlements: group members insert" on public.settlements
  for insert with check (
    exists (
      select 1 from public.group_members
      where group_id = settlements.group_id and user_id = auth.uid()
    )
  );

create index if not exists settlements_group_idx on public.settlements (group_id, created_at desc);
create index if not exists settlements_from_user_idx on public.settlements (from_user);

-- RPC: создать запись об оплате и погасить долг
create or replace function public.create_settlement(
  p_group_id      uuid,
  p_from_user     uuid,
  p_to_user       uuid,
  p_amount        numeric,
  p_payment_method text default 'sbp'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into settlements (group_id, from_user, to_user, amount, payment_method, created_by)
  values (p_group_id, p_from_user, p_to_user, p_amount, p_payment_method, auth.uid())
  returning id into v_id;

  -- Гасит expense_splits, пересчитывает balances, логирует activity
  perform settle_balance(p_group_id, p_from_user, p_to_user);

  return v_id;
end;
$$;

grant execute on function public.create_settlement(uuid, uuid, uuid, numeric, text) to authenticated;

-- Разрешить участникам группы обновлять номер телефона в своём профиле
-- (profiles: own write уже есть в 001, обновление phone покрыто ею)
