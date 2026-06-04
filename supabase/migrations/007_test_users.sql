-- DEV ONLY: тестовые пользователи для разработки
-- Требования:
--   1. Dashboard → Auth → Providers → Email → включить "Enable Email provider"
--   2. Запустить этот SQL в SQL Editor
--
-- Все аккаунты: email / test123
-- Главный: artem@dev.local / test123

create extension if not exists pgcrypto;

do $$
declare
  artem_id  uuid := '10000000-0000-0000-0000-000000000001';
  anna_id   uuid := '10000000-0000-0000-0000-000000000002';
  kostya_id uuid := '10000000-0000-0000-0000-000000000003';
  masha_id  uuid := '10000000-0000-0000-0000-000000000004';
  sasha_id  uuid := '10000000-0000-0000-0000-000000000005';
  vadim_id  uuid := '10000000-0000-0000-0000-000000000006';
  lena_id   uuid := '10000000-0000-0000-0000-000000000007';
begin

  -- ── auth.users ────────────────────────────────────────────
  insert into auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    created_at, updated_at
  ) values
    (artem_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'artem@dev.local',  crypt('test123', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Артём"}',
     false, false, false, now(), now()),

    (anna_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'anna@dev.local',   crypt('test123', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Аня"}',
     false, false, false, now(), now()),

    (kostya_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'kostya@dev.local', crypt('test123', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Костя"}',
     false, false, false, now(), now()),

    (masha_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'masha@dev.local',  crypt('test123', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Маша"}',
     false, false, false, now(), now()),

    (sasha_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'sasha@dev.local',  crypt('test123', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Саша"}',
     false, false, false, now(), now()),

    (vadim_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'vadim@dev.local',  crypt('test123', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Вадим"}',
     false, false, false, now(), now()),

    (lena_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'lena@dev.local',   crypt('test123', gen_salt('bf')), now(), now(),
     '{"provider":"email","providers":["email"]}', '{"display_name":"Лена"}',
     false, false, false, now(), now())

  on conflict do nothing;

  -- ── profiles ──────────────────────────────────────────────
  -- DO UPDATE потому что триггер handle_new_user вставляет строку без display_name раньше нас
  insert into public.profiles (id, display_name) values
    (artem_id,  'Артём'),
    (anna_id,   'Аня'),
    (kostya_id, 'Костя'),
    (masha_id,  'Маша'),
    (sasha_id,  'Саша'),
    (vadim_id,  'Вадим'),
    (lena_id,   'Лена')
  on conflict (id) do update set display_name = excluded.display_name;

end;
$$;
