-- Add Discord message tracking columns to quests table
alter table quests add column if not exists discord_message_id text;
alter table quests add column if not exists discord_channel_id text;
