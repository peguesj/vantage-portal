/*
 * -------------------------------------------------------
 * Section: Account Memberships
 * Stores the relationship between users and accounts (team membership).
 * This is the MakerKit multi-tenancy membership table required by RLS
 * policies across all feature modules.
 * -------------------------------------------------------
 */

create table if not exists public.accounts_memberships (
    id         uuid not null default extensions.uuid_generate_v4(),
    account_id uuid not null references public.accounts(id) on delete cascade,
    user_id    uuid not null references auth.users(id) on delete cascade,
    account_role varchar(50) not null default 'member',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    primary key (id),
    unique (account_id, user_id)
);

comment on table public.accounts_memberships is
    'Stores the membership relationship between users and accounts (teams).';

comment on column public.accounts_memberships.account_id is
    'The account (team) the user belongs to.';

comment on column public.accounts_memberships.user_id is
    'The user who is a member of the account.';

comment on column public.accounts_memberships.account_role is
    'The role of the user within the account (e.g. owner, member, admin).';

create index if not exists am_account_id_idx on public.accounts_memberships(account_id);
create index if not exists am_user_id_idx    on public.accounts_memberships(user_id);

-- Enable RLS
alter table public.accounts_memberships enable row level security;

-- Users can read their own memberships
create policy "accounts_memberships_read_own"
    on public.accounts_memberships
    for select
    to authenticated
    using (user_id = auth.uid());

-- Account owners / service_role can insert memberships
create policy "accounts_memberships_insert"
    on public.accounts_memberships
    for insert
    to authenticated, service_role
    with check (
        account_id in (
            select id from public.accounts
            where created_by = auth.uid()
        )
        or user_id = auth.uid()
    );

-- Service role can manage all memberships
create policy "accounts_memberships_service_role"
    on public.accounts_memberships
    for all
    to service_role
    using (true)
    with check (true);

-- Grant access
grant select, insert, update, delete on table public.accounts_memberships
    to authenticated, service_role;
