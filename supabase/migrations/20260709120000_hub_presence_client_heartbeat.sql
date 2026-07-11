-- Let signed-in hub visitors refresh their own presence (hub-bootstrap alone only
-- pings once on load; staying on the portal requires periodic heartbeats).

create or replace function public.heartbeat_my_hub_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;
  insert into public.hub_presence (user_id, last_seen_at)
  values (uid, now())
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
end;
$$;

revoke all on function public.heartbeat_my_hub_presence() from public;
grant execute on function public.heartbeat_my_hub_presence() to authenticated;
