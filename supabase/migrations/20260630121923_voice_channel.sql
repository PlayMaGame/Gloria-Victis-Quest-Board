alter table public.quests add column if not exists voice_channel text default '';
alter table public.quests add column if not exists discord_message_id text default '';
