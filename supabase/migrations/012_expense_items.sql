-- Добавляем split_type к расходам
alter table public.expenses
  add column if not exists split_type text not null default 'equal'
  check (split_type in ('equal', 'by_items'));

-- Позиции расхода
create table if not exists public.expense_items (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses(id) on delete cascade not null,
  title      text not null,
  amount     numeric(12,2) not null check (amount > 0),
  position   int,
  created_at timestamptz default now() not null
);

-- Участники каждой позиции (делится поровну между назначенными)
create table if not exists public.expense_item_members (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid references public.expense_items(id) on delete cascade not null,
  member_id uuid references public.group_members(id) on delete cascade not null,
  unique (item_id, member_id)
);

alter table public.expense_items enable row level security;
alter table public.expense_item_members enable row level security;

create policy "expense_items: group members read" on public.expense_items
  for select using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_items.expense_id and gm.user_id = auth.uid()
    )
  );

create policy "expense_items: group members insert" on public.expense_items
  for insert with check (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_items.expense_id and gm.user_id = auth.uid()
    )
  );

create policy "expense_item_members: group members read" on public.expense_item_members
  for select using (
    exists (
      select 1 from public.expense_items ei
      join public.expenses e on e.id = ei.expense_id
      join public.group_members gm on gm.group_id = e.group_id
      where ei.id = expense_item_members.item_id and gm.user_id = auth.uid()
    )
  );

create policy "expense_item_members: group members insert" on public.expense_item_members
  for insert with check (
    exists (
      select 1 from public.expense_items ei
      join public.expenses e on e.id = ei.expense_id
      join public.group_members gm on gm.group_id = e.group_id
      where ei.id = expense_item_members.item_id and gm.user_id = auth.uid()
    )
  );

create index if not exists expense_items_expense_idx on public.expense_items (expense_id);
create index if not exists expense_item_members_item_idx on public.expense_item_members (item_id);
create index if not exists expense_item_members_member_idx on public.expense_item_members (member_id);

-- RPC: add_expense (равное деление)
-- Исправляет отсутствующую функцию, вызываемую из useAddExpense
create or replace function public.add_expense(
  p_group_id   uuid,
  p_title      text,
  p_amount     numeric,
  p_paid_by    uuid,
  p_member_ids uuid[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id    uuid;
  v_share numeric;
  v_count int := coalesce(array_length(p_member_ids, 1), 0);
  v_mid   uuid;
begin
  insert into expenses (group_id, title, amount, paid_by, split_type)
  values (p_group_id, p_title, p_amount, p_paid_by, 'equal')
  returning id into v_id;

  if v_count > 0 then
    v_share := round(p_amount / v_count, 2);
    foreach v_mid in array p_member_ids loop
      if v_mid <> p_paid_by then
        insert into expense_splits (expense_id, user_id, amount)
        values (v_id, v_mid, v_share)
        on conflict (expense_id, user_id) do nothing;
      end if;
    end loop;
  end if;

  perform recalculate_balances(p_group_id);
  return v_id;
end;
$$;

grant execute on function public.add_expense(uuid, text, numeric, uuid, uuid[]) to authenticated;

-- RPC: add_expense_by_items (деление по позициям)
-- p_items: [{title, amount, position, member_ids: [user_uuid,...]}]
-- Записывает expense_items + expense_item_members,
-- затем пересчитывает expense_splits атомарно.
create or replace function public.add_expense_by_items(
  p_group_id uuid,
  p_title    text,
  p_amount   numeric,
  p_paid_by  uuid,
  p_items    jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id          uuid;
  v_item        jsonb;
  v_item_id     uuid;
  v_total_check numeric := 0;
  v_cnt         int;
  v_share       numeric;
  v_shares      jsonb   := '{}'::jsonb;
  r             record;
begin
  -- Проверяем: сумма позиций == сумме расхода
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_total_check := v_total_check + (v_item->>'amount')::numeric;
  end loop;
  if round(v_total_check, 2) <> round(p_amount, 2) then
    raise exception 'Сумма позиций (%) не равна сумме расхода (%)', round(v_total_check,2), round(p_amount,2);
  end if;

  insert into expenses (group_id, title, amount, paid_by, split_type)
  values (p_group_id, p_title, p_amount, p_paid_by, 'by_items')
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into expense_items (expense_id, title, amount, position)
    values (
      v_id,
      v_item->>'title',
      (v_item->>'amount')::numeric,
      (v_item->>'position')::int
    )
    returning id into v_item_id;

    v_cnt := jsonb_array_length(v_item->'member_ids');
    if v_cnt = 0 then
      raise exception 'Позиция "%" без участников', v_item->>'title';
    end if;
    v_share := round((v_item->>'amount')::numeric / v_cnt, 2);

    for r in
      select gm.id as gm_id, gm.user_id
      from group_members gm
      where gm.group_id = p_group_id
        and gm.user_id::text = any(
          select jsonb_array_elements_text(v_item->'member_ids')
        )
    loop
      insert into expense_item_members (item_id, member_id)
      values (v_item_id, r.gm_id)
      on conflict (item_id, member_id) do nothing;

      -- Накапливаем долю по user_id
      v_shares := jsonb_set(
        v_shares,
        array[r.user_id::text],
        to_jsonb(coalesce((v_shares->>r.user_id::text)::numeric, 0::numeric) + v_share)
      );
    end loop;
  end loop;

  -- Записываем итоговые доли в expense_splits (только для не-плательщиков)
  for r in select (key::uuid) as uid, (value::text)::numeric as amt from jsonb_each_text(v_shares) loop
    if r.uid <> p_paid_by then
      insert into expense_splits (expense_id, user_id, amount)
      values (v_id, r.uid, r.amt)
      on conflict (expense_id, user_id) do update set amount = excluded.amount;
    end if;
  end loop;

  perform recalculate_balances(p_group_id);
  return v_id;
end;
$$;

grant execute on function public.add_expense_by_items(uuid, text, numeric, uuid, jsonb) to authenticated;
