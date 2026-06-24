import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import { buildQuestEmbed, buildQuestComponents } from './embeds.js';

const {
  DISCORD_TOKEN,
  DISCORD_CHANNEL_ID,
  ALLOWED_ROLE_IDS,
  SUPABASE_URL,
  SUPABASE_KEY,
  BASE_URL = 'https://playmagame.github.io/Gloria-Victis-Quest-Board',
} = process.env;

if (!DISCORD_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required env vars: DISCORD_TOKEN, SUPABASE_URL, SUPABASE_KEY');
  process.exit(1);
}

const allowedRoles = ALLOWED_ROLE_IDS ? ALLOWED_ROLE_IDS.split(',').map(s => s.trim()).filter(Boolean) : [];

// ── Discord client ──
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ── Supabase client ──
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ──
function dbToQ(r) {
  return {
    id: r.id,
    title: r.title || '',
    type: r.type || 'event',
    description: r.description || '',
    item: r.item || '',
    qty: r.qty || '',
    deliverTo: r.deliver_to || '',
    deadline: r.deadline || '',
    poster: r.poster || '',
    rewards: r.rewards || [],
    rewardNote: r.reward_note || '',
    status: r.status || 'open',
    claimedBy: r.claimed_by || null,
    postedAt: r.posted_at,
    pointsValue: r.points_value || 0,
    discordMessageId: r.discord_message_id || null,
    discordChannelId: r.discord_channel_id || null,
  };
}

function statusChanged(oldRow, newRow) {
  return oldRow.status !== newRow.status
    || oldRow.claimed_by !== newRow.claimed_by
    || oldRow.participants?.join(',') !== (newRow.participants || []).join(',');
}

// ── Post a new embed to Discord ──
async function postQuestEmbed(q) {
  const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
  if (!channel) {
    console.error(`Channel ${DISCORD_CHANNEL_ID} not found`);
    return;
  }
  const embed = buildQuestEmbed(q, BASE_URL);
  const components = buildQuestComponents(q, BASE_URL);
  const msg = await channel.send({ embeds: [embed], components });
  await sb.from('quests').update({
    discord_message_id: msg.id,
    discord_channel_id: msg.channel.id,
  }).eq('id', q.id);
  console.log(`Posted embed for quest ${q.id.slice(0, 8)}… (message ${msg.id})`);
}

// ── Edit existing embed ──
async function editQuestEmbed(q) {
  if (!q.discordMessageId) return;
  try {
    const channel = await client.channels.fetch(q.discordChannelId || DISCORD_CHANNEL_ID);
    if (!channel) return;
    const msg = await channel.messages.fetch(q.discordMessageId);
    if (!msg) return;
    const embed = buildQuestEmbed(q, BASE_URL);
    const components = buildQuestComponents(q, BASE_URL);
    await msg.edit({ embeds: [embed], components });
    console.log(`Edited embed for quest ${q.id.slice(0, 8)}…`);
  } catch (err) {
    console.error(`Failed to edit embed for quest ${q.id.slice(0, 8)}…:`, err.message);
  }
}

// ── Catch-up: post embeds for quests missing them ──
async function catchUpMissingEmbeds() {
  const { data, error } = await sb.from('quests')
    .select('*')
    .is('discord_message_id', null)
    .in('status', ['open', 'claimed']);
  if (error) { console.error('Catch-up query error:', error.message); return; }
  for (const row of data || []) {
    await postQuestEmbed(dbToQ(row));
  }
  if (data?.length) {
    console.log(`Caught up ${data.length} quest(s) missing Discord embeds`);
  }
}

// ── Handle Supabase INSERT ──
async function handleInsert(newRow) {
  const q = dbToQ(newRow);
  // Only post for open/claimed quests (skip pending)
  if (q.status === 'pending') return;
  await postQuestEmbed(q);
}

// ── Handle Supabase UPDATE ──
async function handleUpdate(newRow, oldRow) {
  const q = dbToQ(newRow);
  // Only process if this quest already has a Discord message
  if (!q.discordMessageId) {
    // Status changed to open -> first-time post
    if (q.status === 'open' && oldRow.status !== 'open') {
      await postQuestEmbed(q);
    }
    return;
  }
  // Only update embed if meaningful data changed
  if (statusChanged(oldRow, newRow)) {
    await editQuestEmbed(q);
  }
}

// ── Discord interaction handler ──
async function handleInteraction(interaction) {
  if (!interaction.isButton()) return;
  const [action, questId] = interaction.customId.split(':');
  if (action !== 'claim_quest' || !questId) return;

  await interaction.deferReply({ ephemeral: true });

  // Role check
  if (allowedRoles.length) {
    const memberRoles = interaction.member?.roles?.cache;
    const hasRole = memberRoles && allowedRoles.some(rid => memberRoles.has(rid));
    if (!hasRole) {
      await interaction.editReply({ content: '❌ You don\'t have permission to claim quests.' });
      return;
    }
  }

  // Fetch current quest from DB
  const { data, error } = await sb.from('quests').select('*').eq('id', questId).single();
  if (error || !data) {
    await interaction.editReply({ content: '❌ Quest not found in database.' });
    return;
  }

  const q = dbToQ(data);
  if (q.status !== 'open') {
    await interaction.editReply({ content: `❌ This quest is already **${q.status}**.` });
    return;
  }

  // Claim in Supabase
  const claimedByName = interaction.member?.displayName || interaction.user.username;
  const { error: updateError } = await sb.from('quests')
    .update({ status: 'claimed', claimed_by: claimedByName })
    .eq('id', questId);

  if (updateError) {
    console.error('Claim error:', updateError);
    await interaction.editReply({ content: '❌ Failed to claim quest. Try again.' });
    return;
  }

  await interaction.editReply({
    content: `✅ Successfully claimed **${q.title}**! Head to the quest board to track progress.`,
  });
}

// ── Startup ──
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Subscribe to Supabase realtime
  const channel = sb.channel('bot-quests-live');
  channel.on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'quests' },
    async (p) => { try { await handleInsert(p.new); } catch (e) { console.error('INSERT handler error:', e.message); } }
  );
  channel.on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'quests' },
    async (p) => { try { await handleUpdate(p.new, p.old); } catch (e) { console.error('UPDATE handler error:', e.message); } }
  );
  channel.subscribe();

  console.log('Subscribed to Supabase realtime (quests)');

  // Catch-up quests that slipped through while bot was offline
  await catchUpMissingEmbeds();

  console.log('Bot ready');
});

client.on(Events.InteractionCreate, handleInteraction);

client.login(DISCORD_TOKEN);
