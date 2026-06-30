-- 1. Notifications Table
create table if not exists notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references profiles(id) on delete cascade,
    sender_id uuid references profiles(id) on delete cascade,
    type text not null,
    title text,
    message text,
    data jsonb,
    is_read boolean default false,
    created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "Users can view own notifications" 
  on notifications for select 
  using (auth.uid() = recipient_id);

create policy "Users can insert notifications" 
  on notifications for insert 
  with check (auth.uid() = sender_id);

create policy "Users can update own notifications" 
  on notifications for update 
  using (auth.uid() = recipient_id);

-- 2. Follows Table RLS (Ensure it matches requirements)
alter table follows enable row level security;

-- Drop existing policies if they exist so we can recreate them safely
drop policy if exists "Everyone can view follows" on follows;
drop policy if exists "Users can insert their own follows" on follows;
drop policy if exists "Users can delete their own follows" on follows;

create policy "Everyone can view follows" 
  on follows for select 
  using (true);

create policy "Users can insert their own follows" 
  on follows for insert 
  with check (auth.uid() = follower_id);

create policy "Users can delete their own follows" 
  on follows for delete 
  using (auth.uid() = follower_id);

-- Add realtime publication for notifications
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table notifications;
