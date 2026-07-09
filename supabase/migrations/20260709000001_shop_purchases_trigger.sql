create or replace function public.notify_shop_purchase_webhook()
returns trigger
language plpgsql
as $$
declare
  payload jsonb;
  function_url text := 'https://dnwitnnzrkcismsbxfcg.functions.supabase.co/discord-notify';
begin
  payload := jsonb_build_object(
    'type', tg_op,
    'table', 'shop_purchases',
    'record', row_to_json(new)::jsonb,
    'old_record', case when tg_op = 'UPDATE' then row_to_json(old)::jsonb else null end
  );
  perform net.http_post(function_url, payload, '{"Content-Type": "application/json"}'::jsonb);
  return new;
end;
$$;

drop trigger if exists shop_purchase_discord_notify on public.shop_purchases;
create trigger shop_purchase_discord_notify
  after insert or update on public.shop_purchases
  for each row
  execute function public.notify_shop_purchase_webhook();
