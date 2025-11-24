-- Pins table
-- Uses Supabase auth.users for user_id (no foreign key needed, handled by RLS)
create table if not exists pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  title text,
  description text,
  date_taken date,               -- used for chronological ordering
  created_at timestamptz default now()
);

-- Pin media table
create table if not exists pin_media (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid references pins(id) on delete cascade,
  media_url text not null,       -- Supabase storage URL
  thumbnail_url text,            -- optional, for videos
  media_type text not null,      -- 'image' | 'video'
  sort_order int default 0,      -- for ordering media within a pin
  created_at timestamptz default now()
);

-- Indexes for better query performance
create index if not exists idx_pins_user_id on pins(user_id);
create index if not exists idx_pins_date_taken on pins(date_taken);
create index if not exists idx_pin_media_pin_id on pin_media(pin_id);

-- Enable Row Level Security (RLS)
alter table pins enable row level security;
alter table pin_media enable row level security;

-- RLS Policies for pins
-- Users can only see their own pins
create policy "Users can view their own pins" on pins
  for select using (auth.uid() = user_id);

-- Users can insert their own pins
create policy "Users can insert their own pins" on pins
  for insert with check (auth.uid() = user_id);

-- Users can update their own pins
create policy "Users can update their own pins" on pins
  for update using (auth.uid() = user_id);

-- Users can delete their own pins
create policy "Users can delete their own pins" on pins
  for delete using (auth.uid() = user_id);

-- RLS Policies for pin_media
-- Users can view media for their own pins
create policy "Users can view media for their own pins" on pin_media
  for select using (
    exists (
      select 1 from pins
      where pins.id = pin_media.pin_id
      and pins.user_id = auth.uid()
    )
  );

-- Users can insert media for their own pins
create policy "Users can insert media for their own pins" on pin_media
  for insert with check (
    exists (
      select 1 from pins
      where pins.id = pin_media.pin_id
      and pins.user_id = auth.uid()
    )
  );

-- Users can update media for their own pins
create policy "Users can update media for their own pins" on pin_media
  for update using (
    exists (
      select 1 from pins
      where pins.id = pin_media.pin_id
      and pins.user_id = auth.uid()
    )
  );

-- Users can delete media for their own pins
create policy "Users can delete media for their own pins" on pin_media
  for delete using (
    exists (
      select 1 from pins
      where pins.id = pin_media.pin_id
      and pins.user_id = auth.uid()
    )
  );

