alter table public.quests add column if not exists reward_gold int default 0;
alter table public.quests add column if not exists reward_silver int default 0;
alter table public.quests add column if not exists reward_iron int default 0;
alter table public.quests add column if not exists reward_copper int default 0;
