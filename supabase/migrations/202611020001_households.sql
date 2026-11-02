begin;
-- Run once as the database owner. No sample data is copied to real households.
create table public.households (id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 80), created_at timestamptz not null default now());
create table public.household_members (household_id uuid references public.households on delete cascade, user_id uuid unique references auth.users on delete cascade, member_name text not null default 'Household member' check(length(member_name) between 1 and 60), primary key(household_id,user_id));
create table public.household_invites (token uuid primary key default gen_random_uuid(), household_id uuid not null references public.households on delete cascade, expires_at timestamptz not null default now()+interval '24 hours', used_at timestamptz);
create table public.household_records (id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households on delete cascade, kind text not null check(kind in ('bill','booking','pickup')), title text not null check(length(title) between 1 and 160), status text not null check(status in ('pending','paid','planned','booked','scheduled','done')), due_at timestamptz, remind_at timestamptz, revision integer not null default 1, updated_at timestamptz not null default now());
create table public.household_activity (id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households on delete cascade, actor_id uuid references auth.users on delete set null, actor_name text not null, record_id uuid references public.household_records on delete set null, message text not null, created_at timestamptz not null default now());
create table public.push_subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, endpoint text unique not null check(length(endpoint)<2048), p256dh text not null, auth text not null, created_at timestamptz not null default now());
create table public.notification_jobs (id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households on delete cascade, record_id uuid references public.household_records on delete cascade, revision integer, activity_id uuid references public.household_activity on delete cascade, due_at timestamptz not null, processed_at timestamptz, lease_until timestamptz, attempts integer not null default 0);
create table public.notification_deliveries (job_id uuid references public.notification_jobs on delete cascade, subscription_id uuid references public.push_subscriptions on delete cascade, delivered_at timestamptz not null default now(), primary key(job_id,subscription_id));
create index on public.household_members(user_id);
create index on public.household_records(household_id);
create index on public.household_activity(household_id,created_at desc);
create index on public.notification_jobs(due_at) where processed_at is null;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.household_records enable row level security;
alter table public.household_activity enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.notification_deliveries enable row level security;
revoke all on public.households,public.household_members,public.household_invites,public.household_records,public.household_activity,public.push_subscriptions,public.notification_jobs,public.notification_deliveries from anon,authenticated;
grant select on public.households,public.household_members,public.household_records,public.household_activity to authenticated;
grant all on public.households,public.household_members,public.household_invites,public.household_records,public.household_activity,public.push_subscriptions,public.notification_jobs,public.notification_deliveries to service_role;

create function public.is_household_member(hid uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.household_members where household_id=hid and user_id=auth.uid()) $$;
revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
create policy member_households on public.households for select to authenticated using(public.is_household_member(id));
create policy member_members on public.household_members for select to authenticated using(public.is_household_member(household_id));
create policy member_records on public.household_records for select to authenticated using(public.is_household_member(household_id));
create policy member_activity on public.household_activity for select to authenticated using(public.is_household_member(household_id));

create function public.create_household(household_name text, display_name text default 'Household member') returns uuid language plpgsql security definer set search_path='' as $$
declare hid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'Already in a household'; end if;
 insert into public.households(name) values(trim(household_name)) returning id into hid;
 insert into public.household_members(household_id,user_id,member_name) values(hid,auth.uid(),trim(display_name));
 return hid;
end $$;
create function public.create_household_invite(hid uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare code uuid;
begin
 if not public.is_household_member(hid) then raise exception 'Membership required'; end if;
 -- One current invite per household. Treat this code as a private, expiring credential.
 delete from public.household_invites where household_id=hid;
 insert into public.household_invites(household_id) values(hid) returning token into code;
 return code;
end $$;
create function public.join_household(code uuid, display_name text default 'Household member') returns uuid language plpgsql security definer set search_path='' as $$
declare invitation public.household_invites;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'Already in a household'; end if;
 select * into invitation from public.household_invites where token=code and used_at is null and expires_at>now() for update;
 if not found then raise exception 'Invalid or expired invite'; end if;
 if (select count(*) from public.household_members where household_id=invitation.household_id)>=10 then raise exception 'Household member limit reached'; end if;
 insert into public.household_members(household_id,user_id,member_name) values(invitation.household_id,auth.uid(),trim(display_name));
 update public.household_invites set used_at=now() where token=code;
 return invitation.household_id;
end $$;
create function public.save_household_record(hid uuid, rid uuid, expected_revision integer, record_kind text, record_title text, record_status text, event_time timestamptz, reminder_time timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare row_id uuid; rev integer; activity uuid; action text;
begin
 if not public.is_household_member(hid) then raise exception 'Membership required'; end if;
 perform 1 from public.households where id=hid for update;
 if (select count(*) from public.household_activity where household_id=hid and created_at>now()-interval '1 minute')>=30 then raise exception 'Too many updates. Please wait a minute.'; end if;
 if not ((record_kind='bill' and record_status in ('pending','paid')) or (record_kind='booking' and record_status in ('planned','booked')) or (record_kind='pickup' and record_status in ('scheduled','done'))) then raise exception 'Invalid record status'; end if;
 if reminder_time is not null and (reminder_time<=now() or reminder_time>now()+interval '1 year') then raise exception 'Reminder must be in the next year'; end if;
 if rid is null then
  if (select count(*) from public.household_records where household_id=hid)>=200 then raise exception 'Household record limit reached'; end if;
  insert into public.household_records(household_id,kind,title,status,due_at,remind_at) values(hid,record_kind,trim(record_title),record_status,event_time,reminder_time) returning id,revision into row_id,rev;
 else
  update public.household_records set kind=record_kind,title=trim(record_title),status=record_status,due_at=event_time,remind_at=reminder_time,revision=revision+1,updated_at=now() where id=rid and household_id=hid and revision=expected_revision returning id,revision into row_id,rev;
  if not found then raise exception 'Record changed on another device. Refresh before editing.'; end if;
 end if;
 action:=case when record_status='paid' then 'marked paid manually' when record_status='booked' then 'marked booked manually' else 'updated: '||record_status end;
 insert into public.household_activity(household_id,actor_id,actor_name,record_id,message) values(hid,auth.uid(),(select member_name from public.household_members where household_id=hid and user_id=auth.uid()),row_id,trim(record_title)||' — '||action) returning id into activity;
 -- Record edit + durable notification jobs commit together.
 insert into public.notification_jobs(household_id,record_id,revision,activity_id,due_at) values(hid,row_id,rev,activity,now());
 if reminder_time is not null and record_status not in ('paid','done') then
  insert into public.notification_jobs(household_id,record_id,revision,due_at) values(hid,row_id,rev,reminder_time);
 end if;
 return row_id;
end $$;
create function public.leave_household(hid uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.household_members where household_id=hid and user_id=auth.uid();
 delete from public.push_subscriptions where user_id=auth.uid();
 delete from public.households where id=hid and not exists(select 1 from public.household_members where household_id=hid);
end $$;
revoke all on function public.create_household(text,text),public.create_household_invite(uuid),public.join_household(uuid,text),public.save_household_record(uuid,uuid,integer,text,text,text,timestamptz,timestamptz),public.leave_household(uuid) from public;
grant execute on function public.create_household(text,text),public.create_household_invite(uuid),public.join_household(uuid,text),public.save_household_record(uuid,uuid,integer,text,text,text,timestamptz,timestamptz),public.leave_household(uuid) to authenticated;

-- Worker lease prevents concurrent cron calls claiming the same batch.
create function public.claim_notification_jobs() returns setof public.notification_jobs language sql security definer set search_path='' as $$
 update public.notification_jobs set lease_until=now()+interval '5 minutes',attempts=attempts+1 where id in (
 select id from public.notification_jobs where processed_at is null and due_at<=now() and (lease_until is null or lease_until<now()) and attempts<8 order by due_at limit 20 for update skip locked
 ) returning *;
$$;
revoke all on function public.claim_notification_jobs() from public,anon,authenticated;
grant execute on function public.claim_notification_jobs() to service_role;

commit;
