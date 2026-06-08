-- Поля премиума в профилях (трекинг для будущих наград)
alter table public.profiles
  add column if not exists is_premium boolean not null default false;
alter table public.profiles
  add column if not exists premium_until timestamptz;

-- Реферальные коды (по одному на пользователя)
create table if not exists public.referral_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  code       text unique not null,
  created_at timestamptz default now() not null,
  unique (user_id)
);

alter table public.referral_codes enable row level security;

-- Свой код виден владельцу; lookup по чужому коду нужен при регистрации
create policy "referral_codes: owner read" on public.referral_codes
  for select using (auth.uid() is not null);

-- Кто кого пригласил (один пользователь — одно приглашение)
create table if not exists public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.profiles(id) on delete set null,
  referred_id uuid references public.profiles(id) on delete cascade not null,
  code        text,
  created_at  timestamptz default now() not null,
  rewarded_at timestamptz,
  unique (referred_id)
);

alter table public.referrals enable row level security;

create policy "referrals: own read" on public.referrals
  for select using (referrer_id = auth.uid() or referred_id = auth.uid());

create index if not exists referral_codes_code_idx on public.referral_codes (code);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

create extension if not exists pgcrypto;

-- Функция генерации уникального кода (6 символов base16 uppercase)
create or replace function public.generate_referral_code(p_user_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code    text;
  v_tries   int := 0;
begin
  -- Вернуть существующий, если уже есть
  select code into v_code from referral_codes where user_id = p_user_id;
  if found then return v_code; end if;

  loop
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into referral_codes (user_id, code) values (p_user_id, v_code);
      return v_code;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 20 then raise exception 'generate_referral_code: не удалось подобрать уникальный код'; end if;
    end;
  end loop;
end;
$$;

grant execute on function public.generate_referral_code(uuid) to authenticated;

-- Триггер: генерировать код при создании профиля
create or replace function public.handle_new_profile_referral()
returns trigger language plpgsql security definer as $$
begin
  perform public.generate_referral_code(new.id);
  return new;
end;
$$;

create trigger on_profile_created_referral
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_referral();

-- Бэкфилл для уже существующих профилей
do $$
declare r record;
begin
  for r in
    select id from public.profiles
    where id not in (select user_id from public.referral_codes)
  loop
    perform public.generate_referral_code(r.id);
  end loop;
end;
$$;

-- RPC: применить реферальный код при регистрации
create or replace function public.use_referral_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_referrer uuid;
  v_caller   uuid := auth.uid();
begin
  select user_id into v_referrer
  from referral_codes where code = upper(trim(p_code));

  if not found then
    return jsonb_build_object('success', false, 'error', 'Код не найден');
  end if;

  if v_referrer = v_caller then
    return jsonb_build_object('success', false, 'error', 'Нельзя использовать собственный код');
  end if;

  if exists (select 1 from referrals where referred_id = v_caller) then
    return jsonb_build_object('success', false, 'error', 'Вы уже использовали реферальный код');
  end if;

  insert into referrals (referrer_id, referred_id, code)
  values (v_referrer, v_caller, upper(trim(p_code)));

  return jsonb_build_object('success', true, 'referrer_id', v_referrer);
end;
$$;

grant execute on function public.use_referral_code(text) to authenticated;
