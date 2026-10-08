-- Supabase stand-ins for the real-Postgres search test (search.pg.test.ts).
-- Use a THROWAWAY local Postgres 16 database, never the hosted one and never apps/api/.env.
--
--   psql -d postgres -c 'create database onti_s5_check'
--   psql -d onti_s5_check -v ON_ERROR_STOP=1 -f apps/api/test/postgres/standins.sql
--   for f in supabase/migrations/*.sql; do
--     psql -U onti_check_api -d onti_s5_check -v ON_ERROR_STOP=1 -f "$f"
--   done
--   ONTI_TEST_DATABASE_URL='postgresql://onti_check_api@/onti_s5_check?host=/tmp' \
--     npm run test -w @onti/api
--
-- Tear down: drop the database, then the roles below (cluster-wide, so only if nothing else uses them).
--   psql -d postgres -c 'drop database onti_s5_check' -c 'drop role onti_check_api' \
--     -c 'drop role service_role' -c 'drop role authenticated' -c 'drop role anon'
--
-- Run as a local superuser in the empty database. It mirrors what the API assumes of Supabase:
-- the API roles, `auth.users`, `auth.uid()`, and a LOGIN role (stand-in for `postgres`) that
-- bypasses RLS and may `set local role authenticated`.

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'onti_check_api') then
    create role onti_check_api login nosuperuser bypassrls;
  end if;
end
$$;
grant anon, authenticated, service_role to onti_check_api;
alter database onti_s5_check owner to onti_check_api;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz default now()
);

-- Supabase's definition of auth.uid().
create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role, onti_check_api;
grant execute on function auth.uid() to anon, authenticated, service_role, onti_check_api;
-- The migration role creates FKs to auth.users and the test seeds and removes users.
grant select, insert, delete, references, trigger on auth.users to onti_check_api;
grant usage on schema public to anon, authenticated, service_role;
