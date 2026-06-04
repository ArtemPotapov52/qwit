-- Allow any authenticated user to read all profiles (required for member search)
-- Previously "profiles: own read" only allowed reading your own profile,
-- which broke the add-member search entirely.
create policy "profiles: authenticated read all"
  on public.profiles for select
  using (auth.uid() is not null);
