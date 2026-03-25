-- Scribe Clone Schema: AI-powered step-by-step guide creation
-- Migration: 20260213000000_scribe_schema.sql

-- Enums
create type public.guide_status as enum ('draft', 'published', 'archived');
create type public.guide_visibility as enum ('private', 'team', 'public');
create type public.annotation_type as enum ('arrow', 'rectangle', 'circle', 'text', 'blur', 'highlight', 'click_indicator');
create type public.page_item_type as enum ('guide_embed', 'text_block', 'video_link', 'image', 'divider');
create type public.share_permission as enum ('view', 'edit', 'comment');

-- Guides: Core guide records
create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null default 'Untitled Guide',
  description text,
  status public.guide_status not null default 'draft',
  visibility public.guide_visibility not null default 'private',
  cover_image_url text,
  tags text[] default '{}',
  step_count integer not null default 0,
  view_count integer not null default 0,
  is_template boolean not null default false,
  source_url text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Guide Steps: Individual steps within a guide
create table if not exists public.guide_steps (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  step_order integer not null,
  title text,
  instruction text,
  click_target text,
  url text,
  screenshot_url text,
  screenshot_storage_path text,
  annotations jsonb default '[]',
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guide_id, step_order)
);

-- Guide Annotations: Overlay data for screenshots
create table if not exists public.guide_annotations (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.guide_steps(id) on delete cascade,
  annotation_type public.annotation_type not null,
  x double precision not null default 0,
  y double precision not null default 0,
  width double precision,
  height double precision,
  rotation double precision default 0,
  color text default '#ff0000',
  stroke_width double precision default 2,
  text_content text,
  font_size double precision default 14,
  opacity double precision default 1,
  props jsonb default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Guide Pages: Multi-guide collections
create table if not exists public.guide_pages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null default 'Untitled Page',
  description text,
  slug text,
  is_published boolean not null default false,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Guide Page Items: Items within a page
create table if not exists public.guide_page_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.guide_pages(id) on delete cascade,
  item_type public.page_item_type not null,
  item_order integer not null,
  guide_id uuid references public.guides(id) on delete set null,
  content text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, item_order)
);

-- Guide Shares: Share links with permissions
create table if not exists public.guide_shares (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  permission public.share_permission not null default 'view',
  password_hash text,
  expires_at timestamptz,
  max_views integer,
  current_views integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Guide Templates: Reusable templates
create table if not exists public.guide_templates (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts(id) on delete cascade,
  guide_id uuid not null references public.guides(id) on delete cascade,
  name text not null,
  description text,
  category text,
  is_public boolean not null default false,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_guides_account_id on public.guides(account_id);
create index idx_guides_status on public.guides(status);
create index idx_guides_created_by on public.guides(created_by);
create index idx_guides_created_at on public.guides(created_at desc);
create index idx_guides_is_template on public.guides(is_template) where is_template = true;

create index idx_guide_steps_guide_id on public.guide_steps(guide_id);
create index idx_guide_steps_order on public.guide_steps(guide_id, step_order);

create index idx_guide_annotations_step_id on public.guide_annotations(step_id);

create index idx_guide_pages_account_id on public.guide_pages(account_id);
create index idx_guide_pages_slug on public.guide_pages(slug);

create index idx_guide_page_items_page_id on public.guide_page_items(page_id);

create index idx_guide_shares_token on public.guide_shares(token);
create index idx_guide_shares_guide_id on public.guide_shares(guide_id);

create index idx_guide_templates_account_id on public.guide_templates(account_id);
create index idx_guide_templates_is_public on public.guide_templates(is_public) where is_public = true;

-- Triggers for updated_at
create trigger set_guides_updated_at
  before update on public.guides
  for each row execute function public.update_updated_at_column();

create trigger set_guide_steps_updated_at
  before update on public.guide_steps
  for each row execute function public.update_updated_at_column();

create trigger set_guide_annotations_updated_at
  before update on public.guide_annotations
  for each row execute function public.update_updated_at_column();

create trigger set_guide_pages_updated_at
  before update on public.guide_pages
  for each row execute function public.update_updated_at_column();

create trigger set_guide_page_items_updated_at
  before update on public.guide_page_items
  for each row execute function public.update_updated_at_column();

create trigger set_guide_shares_updated_at
  before update on public.guide_shares
  for each row execute function public.update_updated_at_column();

create trigger set_guide_templates_updated_at
  before update on public.guide_templates
  for each row execute function public.update_updated_at_column();

-- Step count trigger: auto-update guides.step_count
create or replace function public.update_guide_step_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' or TG_OP = 'DELETE' then
    update public.guides
    set step_count = (
      select count(*) from public.guide_steps where guide_id = coalesce(NEW.guide_id, OLD.guide_id)
    )
    where id = coalesce(NEW.guide_id, OLD.guide_id);
  end if;
  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

create trigger update_guide_step_count_trigger
  after insert or delete on public.guide_steps
  for each row execute function public.update_guide_step_count();

-- RLS Policies
alter table public.guides enable row level security;
alter table public.guide_steps enable row level security;
alter table public.guide_annotations enable row level security;
alter table public.guide_pages enable row level security;
alter table public.guide_page_items enable row level security;
alter table public.guide_shares enable row level security;
alter table public.guide_templates enable row level security;

-- Guides: users can manage guides in their account
create policy guides_select on public.guides
  for select to authenticated
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy guides_insert on public.guides
  for insert to authenticated
  with check (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy guides_update on public.guides
  for update to authenticated
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy guides_delete on public.guides
  for delete to authenticated
  using (
    created_by = auth.uid()
    or account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid() and account_role = 'owner'
    )
  );

-- Guide steps: accessible if parent guide is accessible
create policy guide_steps_select on public.guide_steps
  for select to authenticated
  using (
    guide_id in (select id from public.guides)
  );

create policy guide_steps_insert on public.guide_steps
  for insert to authenticated
  with check (
    guide_id in (select id from public.guides)
  );

create policy guide_steps_update on public.guide_steps
  for update to authenticated
  using (
    guide_id in (select id from public.guides)
  );

create policy guide_steps_delete on public.guide_steps
  for delete to authenticated
  using (
    guide_id in (select id from public.guides)
  );

-- Guide annotations: accessible if parent step is accessible
create policy guide_annotations_select on public.guide_annotations
  for select to authenticated
  using (
    step_id in (select id from public.guide_steps)
  );

create policy guide_annotations_insert on public.guide_annotations
  for insert to authenticated
  with check (
    step_id in (select id from public.guide_steps)
  );

create policy guide_annotations_update on public.guide_annotations
  for update to authenticated
  using (
    step_id in (select id from public.guide_steps)
  );

create policy guide_annotations_delete on public.guide_annotations
  for delete to authenticated
  using (
    step_id in (select id from public.guide_steps)
  );

-- Guide pages: account-scoped
create policy guide_pages_select on public.guide_pages
  for select to authenticated
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy guide_pages_insert on public.guide_pages
  for insert to authenticated
  with check (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy guide_pages_update on public.guide_pages
  for update to authenticated
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy guide_pages_delete on public.guide_pages
  for delete to authenticated
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid() and account_role = 'owner'
    )
  );

-- Guide page items: accessible if parent page is accessible
create policy guide_page_items_select on public.guide_page_items
  for select to authenticated
  using (
    page_id in (select id from public.guide_pages)
  );

create policy guide_page_items_insert on public.guide_page_items
  for insert to authenticated
  with check (
    page_id in (select id from public.guide_pages)
  );

create policy guide_page_items_update on public.guide_page_items
  for update to authenticated
  using (
    page_id in (select id from public.guide_pages)
  );

create policy guide_page_items_delete on public.guide_page_items
  for delete to authenticated
  using (
    page_id in (select id from public.guide_pages)
  );

-- Guide shares: owner/team can manage, anonymous can read via token
create policy guide_shares_select on public.guide_shares
  for select to authenticated
  using (
    guide_id in (select id from public.guides)
  );

create policy guide_shares_insert on public.guide_shares
  for insert to authenticated
  with check (
    guide_id in (select id from public.guides)
  );

create policy guide_shares_update on public.guide_shares
  for update to authenticated
  using (
    guide_id in (select id from public.guides)
  );

create policy guide_shares_delete on public.guide_shares
  for delete to authenticated
  using (
    guide_id in (select id from public.guides)
  );

-- Public share access (anonymous)
create policy guide_shares_anon_select on public.guide_shares
  for select to anon
  using (is_active = true and (expires_at is null or expires_at > now()));

-- Public guide access via share
create policy guides_anon_select on public.guides
  for select to anon
  using (
    id in (
      select guide_id from public.guide_shares
      where is_active = true and (expires_at is null or expires_at > now())
    )
  );

create policy guide_steps_anon_select on public.guide_steps
  for select to anon
  using (
    guide_id in (
      select guide_id from public.guide_shares
      where is_active = true and (expires_at is null or expires_at > now())
    )
  );

create policy guide_annotations_anon_select on public.guide_annotations
  for select to anon
  using (
    step_id in (
      select gs.id from public.guide_steps gs
      inner join public.guide_shares sh on sh.guide_id = gs.guide_id
      where sh.is_active = true and (sh.expires_at is null or sh.expires_at > now())
    )
  );

-- Guide templates: public templates visible to all authenticated users
create policy guide_templates_select on public.guide_templates
  for select to authenticated
  using (
    is_public = true
    or account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy guide_templates_insert on public.guide_templates
  for insert to authenticated
  with check (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy guide_templates_update on public.guide_templates
  for update to authenticated
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

create policy guide_templates_delete on public.guide_templates
  for delete to authenticated
  using (
    account_id in (
      select account_id from public.accounts_memberships
      where user_id = auth.uid()
    )
  );

-- Storage bucket for guide screenshots
insert into storage.buckets (id, name, public)
values ('guide-screenshots', 'guide-screenshots', true)
on conflict (id) do nothing;

-- Storage policies for guide screenshots
create policy guide_screenshots_select on storage.objects
  for select to authenticated
  using (bucket_id = 'guide-screenshots');

create policy guide_screenshots_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'guide-screenshots');

create policy guide_screenshots_update on storage.objects
  for update to authenticated
  using (bucket_id = 'guide-screenshots');

create policy guide_screenshots_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'guide-screenshots');

-- Public read access for shared guide screenshots
create policy guide_screenshots_anon_select on storage.objects
  for select to anon
  using (bucket_id = 'guide-screenshots');
