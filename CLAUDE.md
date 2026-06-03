# CLAUDE.md — Qwit

## Project

Мобильное приложение для совместного учёта расходов в группах.
React Native / Expo Router (TypeScript), Supabase (Auth + DB + Realtime).

## Stack

- **Framework**: Expo SDK 53, Expo Router v5
- **Language**: TypeScript (strict)
- **Auth**: Supabase Auth — телефон + OTP (SMS)
- **DB**: Supabase Postgres — RLS на всех таблицах
- **State**: Zustand
- **Storage**: expo-secure-store (сессия Supabase)

## Structure

```
app/
  _layout.tsx          — root layout, auth guard, session listener
  (auth)/
    index.tsx          — ввод телефона
    otp.tsx            — OTP-верификация
  (tabs)/
    groups.tsx         — список групп
    stats.tsx          — статистика трат
    activity.tsx       — лента событий
    profile.tsx        — профиль + выход
components/
  ui/                  — переиспользуемые примитивы
  layout/              — обёртки/контейнеры
constants/
  colors.ts            — цветовая система CANON
lib/
  supabase.ts          — Supabase client (SecureStore adapter)
store/
  auth.ts              — Zustand: session, user, signOut
hooks/                 — кастомные хуки
supabase/migrations/   — SQL-миграции 001→005
```

## Commands

```bash
npm install
npx expo start          # dev server
npx expo start --ios    # iOS simulator
npx expo start --android
```

## Environment

Скопируй `.env.example` → `.env` и заполни:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Migrations

Применяй через Supabase SQL Editor в порядке 001→005.
RLS включён на всех таблицах — пользователи видят только свои данные.

## Conventions

- Все цвета из `constants/colors.ts` (Colors.*), не хардкодить hex
- StyleSheet.create для всех стилей — не инлайн-объекты
- Навигация через Expo Router (`useRouter`, `useSegments`) — не react-navigation напрямую
- Supabase вызовы только из хуков/store, не из компонентов напрямую
- Не рефакторить `lib/supabase.ts` без явной причины — SecureStore adapter критичен

## Rules

- Никаких .env в коммитах
- Не изменять RLS-политики без проверки — безопасность данных критична
- `app/_layout.tsx` — точка входа auth guard, осторожно с изменениями
