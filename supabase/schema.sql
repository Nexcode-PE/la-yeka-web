-- Run this script in the Supabase SQL editor to provision the La Yeka catalog.
create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(8,2) not null check (price >= 0),
  image_path text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  notes text,
  total numeric(8,2) not null check (total >= 0),
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','ready','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(8,2) not null check (unit_price >= 0),
  quantity smallint not null check (quantity > 0),
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Public catalog read" on public.categories for select using (true);
create policy "Public product read" on public.products for select using (is_available = true);
-- Add authenticated admin policies after configuring your Supabase Auth roles.
