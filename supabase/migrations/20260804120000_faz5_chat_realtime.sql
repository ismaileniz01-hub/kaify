-- Faz 5 / TD-005: team chat Realtime (INSERT on chat_messages).
-- Clients subscribe with RLS (select own); service_role inserts still fan out
-- to the owning authenticated session.

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then
    null;
  when undefined_object then
    -- Local/dev without default publication: create and add.
    begin
      create publication supabase_realtime for table public.chat_messages;
    exception
      when duplicate_object then
        alter publication supabase_realtime add table public.chat_messages;
    end;
end $$;
