-- ─────────────────────────────────────────────────────
-- 014: Гостевые участники (без регистрации)
-- ─────────────────────────────────────────────────────

-- 1. group_members: user_id nullable + поля гостя
alter table public.group_members
  alter column user_id drop not null;
alter table public.group_members
  add column if not exists guest_name  text,
  add column if not exists guest_phone text;
alter table public.group_members
  add constraint gm_identity check (user_id is not null or guest_name is not null);

-- Политика: участник группы может добавлять гостей
create policy "group_members: member can add guests" on public.group_members
  for insert with check (
    user_id is null
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
    )
  );

-- 2. expenses: добавляем paid_by_member → group_members.id
alter table public.expenses
  add column if not exists paid_by_member uuid references public.group_members(id) on delete set null;

-- Бэкфилл: найти group_members.id по paid_by (profiles.id)
update public.expenses e
set paid_by_member = gm.id
from public.group_members gm
where gm.group_id = e.group_id
  and gm.user_id = e.paid_by
  and e.paid_by_member is null;

-- 3. expense_splits: добавляем member_id → group_members.id
alter table public.expense_splits
  alter column user_id drop not null;
alter table public.expense_splits
  add column if not exists member_id uuid references public.group_members(id) on delete cascade;

-- Бэкфилл member_id
update public.expense_splits es
set member_id = gm.id
from public.expenses e
join public.group_members gm
  on gm.group_id = e.group_id and gm.user_id = es.user_id
where es.expense_id = e.id
  and es.member_id is null;

-- Заменяем уникальный индекс на member_id
alter table public.expense_splits
  drop constraint if exists expense_splits_expense_id_user_id_key;
create unique index if not exists expense_splits_member_unique
  on public.expense_splits (expense_id, member_id)
  where member_id is not null;

-- 4. balances: добавляем from_member / to_member → group_members.id
alter table public.balances
  alter column from_user drop not null,
  alter column to_user   drop not null;
alter table public.balances
  add column if not exists from_member uuid references public.group_members(id) on delete cascade,
  add column if not exists to_member   uuid references public.group_members(id) on delete cascade;

-- Бэкфилл
update public.balances b
set from_member = gm1.id,
    to_member   = gm2.id
from public.group_members gm1
join public.group_members gm2
  on gm2.group_id = b.group_id and gm2.user_id = b.to_user
where gm1.group_id = b.group_id
  and gm1.user_id  = b.from_user
  and b.from_member is null;

-- Заменяем уникальный индекс
alter table public.balances
  drop constraint if exists balances_group_id_from_user_to_user_key;
create unique index if not exists balances_member_unique
  on public.balances (group_id, from_member, to_member)
  where from_member is not null and to_member is not null;

-- 5. settlements: добавляем member-колонки
alter table public.settlements
  alter column from_user drop not null,
  alter column to_user   drop not null;
alter table public.settlements
  add column if not exists from_member uuid references public.group_members(id) on delete set null,
  add column if not exists to_member   uuid references public.group_members(id) on delete set null;

-- 6. Обновляем recalculate_balances — использует member_id
create or replace function public.recalculate_balances(p_group_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.balances where group_id = p_group_id;

  insert into public.balances (group_id, from_user, to_user, from_member, to_member, amount, currency)
  select
    e.group_id,
    splitter.user_id,
    payer.user_id,
    splitter.id,
    payer.id,
    sum(es.amount),
    e.currency
  from public.expenses e
  join public.expense_splits es on es.expense_id = e.id
  join public.group_members payer    on payer.id = e.paid_by_member
  join public.group_members splitter on splitter.id = es.member_id
  where e.group_id = p_group_id
    and splitter.id <> payer.id
    and not es.settled
  group by e.group_id, splitter.id, payer.id, splitter.user_id, payer.user_id, e.currency
  having sum(es.amount) > 0;
end;
$$;

-- 7. Обновляем settle_balance — принимает group_members.id
create or replace function public.settle_balance(
  p_group_id    uuid,
  p_from_member uuid,
  p_to_member   uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_amount   numeric;
  v_actor_id uuid;
begin
  select user_id into v_actor_id from public.group_members where id = p_from_member;

  select coalesce(sum(es.amount), 0) into v_amount
  from public.expense_splits es
  join public.expenses e on es.expense_id = e.id
  where es.member_id     = p_from_member
    and e.paid_by_member = p_to_member
    and e.group_id       = p_group_id
    and not es.settled;

  update public.expense_splits es
  set settled = true
  from public.expenses e
  where es.expense_id    = e.id
    and es.member_id     = p_from_member
    and e.paid_by_member = p_to_member
    and e.group_id       = p_group_id
    and not es.settled;

  perform public.recalculate_balances(p_group_id);

  insert into public.activity (group_id, actor_id, type, payload)
  values (
    p_group_id,
    coalesce(v_actor_id, auth.uid()),
    'expense_settled',
    jsonb_build_object('from_member', p_from_member, 'to_member', p_to_member, 'amount', v_amount)
  );
end;
$$;

grant execute on function public.settle_balance(uuid, uuid, uuid) to authenticated;

-- 8. Обновляем create_settlement — принимает member IDs
create or replace function public.create_settlement(
  p_group_id       uuid,
  p_from_member    uuid,
  p_to_member      uuid,
  p_amount         numeric,
  p_payment_method text default 'sbp'
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid;
  v_from_uid uuid;
  v_to_uid   uuid;
begin
  select user_id into v_from_uid from public.group_members where id = p_from_member;
  select user_id into v_to_uid   from public.group_members where id = p_to_member;

  insert into public.settlements
    (group_id, from_user, to_user, from_member, to_member, amount, payment_method, created_by)
  values
    (p_group_id, v_from_uid, v_to_uid, p_from_member, p_to_member,
     p_amount, p_payment_method, auth.uid())
  returning id into v_id;

  perform public.settle_balance(p_group_id, p_from_member, p_to_member);
  return v_id;
end;
$$;

grant execute on function public.create_settlement(uuid, uuid, uuid, numeric, text) to authenticated;

-- 9. Обновляем add_expense — p_paid_by и p_member_ids теперь group_members.id
create or replace function public.add_expense(
  p_group_id   uuid,
  p_title      text,
  p_amount     numeric,
  p_paid_by    uuid,   -- group_members.id
  p_member_ids uuid[]  -- group_members.id[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id    uuid;
  v_share numeric;
  v_count int := coalesce(array_length(p_member_ids, 1), 0);
  v_mid   uuid;
  v_uid   uuid;
begin
  select user_id into v_uid from public.group_members where id = p_paid_by;

  insert into public.expenses (group_id, title, amount, paid_by, paid_by_member, split_type)
  values (p_group_id, p_title, p_amount, v_uid, p_paid_by, 'equal')
  returning id into v_id;

  if v_count > 0 then
    v_share := round(p_amount / v_count, 2);
    foreach v_mid in array p_member_ids loop
      if v_mid <> p_paid_by then
        select user_id into v_uid from public.group_members where id = v_mid;
        insert into public.expense_splits (expense_id, user_id, member_id, amount)
        values (v_id, v_uid, v_mid, v_share)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  perform public.recalculate_balances(p_group_id);
  return v_id;
end;
$$;

grant execute on function public.add_expense(uuid, text, numeric, uuid, uuid[]) to authenticated;

-- 10. Обновляем add_expense_by_items — member_ids в items теперь group_members.id
create or replace function public.add_expense_by_items(
  p_group_id uuid,
  p_title    text,
  p_amount   numeric,
  p_paid_by  uuid,   -- group_members.id
  p_items    jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id          uuid;
  v_item        jsonb;
  v_item_id     uuid;
  v_total_check numeric := 0;
  v_cnt         int;
  v_share       numeric;
  v_shares      jsonb := '{}'::jsonb;
  v_paid_uid    uuid;
  r             record;
begin
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_total_check := v_total_check + (v_item->>'amount')::numeric;
  end loop;
  if round(v_total_check, 2) <> round(p_amount, 2) then
    raise exception 'Сумма позиций (%) не равна сумме расхода (%)', round(v_total_check,2), round(p_amount,2);
  end if;

  select user_id into v_paid_uid from public.group_members where id = p_paid_by;

  insert into public.expenses (group_id, title, amount, paid_by, paid_by_member, split_type)
  values (p_group_id, p_title, p_amount, v_paid_uid, p_paid_by, 'by_items')
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.expense_items (expense_id, title, amount, position)
    values (v_id, v_item->>'title', (v_item->>'amount')::numeric, (v_item->>'position')::int)
    returning id into v_item_id;

    v_cnt := jsonb_array_length(v_item->'member_ids');
    if v_cnt = 0 then
      raise exception 'Позиция "%" без участников', v_item->>'title';
    end if;
    v_share := round((v_item->>'amount')::numeric / v_cnt, 2);

    for r in
      select gm.id, gm.user_id
      from public.group_members gm
      where gm.group_id = p_group_id
        and gm.id::text = any(select jsonb_array_elements_text(v_item->'member_ids'))
    loop
      insert into public.expense_item_members (item_id, member_id)
      values (v_item_id, r.id)
      on conflict (item_id, member_id) do nothing;

      v_shares := jsonb_set(
        v_shares,
        array[r.id::text],
        to_jsonb(coalesce((v_shares->>r.id::text)::numeric, 0::numeric) + v_share)
      );
    end loop;
  end loop;

  for r in select (key::uuid) as mid, (value::text)::numeric as amt from jsonb_each_text(v_shares) loop
    if r.mid <> p_paid_by then
      select user_id into v_paid_uid from public.group_members where id = r.mid;
      insert into public.expense_splits (expense_id, user_id, member_id, amount)
      values (v_id, v_paid_uid, r.mid, r.amt)
      on conflict do nothing;
    end if;
  end loop;

  perform public.recalculate_balances(p_group_id);
  return v_id;
end;
$$;

grant execute on function public.add_expense_by_items(uuid, text, numeric, uuid, jsonb) to authenticated;
