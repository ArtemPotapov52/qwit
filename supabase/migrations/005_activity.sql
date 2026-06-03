-- Лента событий (feed)
create table if not exists public.activity (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.groups(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  type        text not null, -- 'expense_added' | 'expense_settled' | 'member_joined' | 'group_created'
  payload     jsonb,
  created_at  timestamptz default now() not null
);

alter table public.activity enable row level security;

create index activity_group_created_idx on public.activity (group_id, created_at desc);

create policy "activity: group members read" on public.activity
  for select using (
    group_id is null
    or exists (
      select 1 from public.group_members
      where group_id = activity.group_id and user_id = auth.uid()
    )
  );

-- Триггер: добавляем событие при создании траты
create or replace function public.log_expense_added()
returns trigger language plpgsql security definer as $$
begin
  insert into public.activity (group_id, actor_id, type, payload)
  values (
    new.group_id,
    new.paid_by,
    'expense_added',
    jsonb_build_object('expense_id', new.id, 'title', new.title, 'amount', new.amount, 'currency', new.currency)
  );
  return new;
end;
$$;

create trigger on_expense_added
  after insert on public.expenses
  for each row execute procedure public.log_expense_added();
