create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  consented_at timestamptz,
  next_period date,
  period_reminder_days smallint check (period_reminder_days between 0 and 14),
  pill_reminder_hour smallint check (pill_reminder_hour between 0 and 23),
  tz text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now()
);

create table public.cycles (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  start_date date not null,
  end_date date,
  unique (user_id, start_date),
  check (end_date is null or end_date >= start_date)
);

-- fk to profiles (not auth.users) so the reminder function can embed subscriptions
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null
);

alter table public.profiles enable row level security;
alter table public.cycles enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own cycles" on public.cycles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own subscriptions" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- hard delete; cascades to every table above (DPDP right to erasure)
create function public.delete_my_account() returns void
language sql security definer set search_path = ''
as $$ delete from auth.users where id = auth.uid() $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
