-- Fix "Database error deleting user" from the Supabase dashboard.
--
-- Deleting an auth user must cascade through profiles and every table that
-- references the user. Any foreign key that references public.profiles(id) or
-- auth.users(id) WITHOUT "on delete cascade" blocks the delete. This rewrites
-- all such FKs to cascade, so deleting a user removes all their associated data
-- (which is exactly what the dashboard's delete dialog promises).

do $$
declare
  r record;
  def text;
begin
  for r in
    select con.oid,
           con.conname,
           con.conrelid::regclass::text as child_table
    from pg_constraint con
    join pg_class      fcl on fcl.oid = con.confrelid
    join pg_namespace  fns on fns.oid = fcl.relnamespace
    where con.contype = 'f'
      and con.confdeltype <> 'c'          -- not already ON DELETE CASCADE
      and (
        (fns.nspname = 'public' and fcl.relname = 'profiles')
        or (fns.nspname = 'auth'   and fcl.relname = 'users')
      )
  loop
    -- pg_get_constraintdef gives e.g. "FOREIGN KEY (user_id) REFERENCES profiles(id)"
    def := pg_get_constraintdef(r.oid);
    execute format('alter table %s drop constraint %I', r.child_table, r.conname);
    execute format('alter table %s add constraint %I %s on delete cascade',
                   r.child_table, r.conname, def);
    raise notice 'cascaded FK % on %', r.conname, r.child_table;
  end loop;
end $$;
