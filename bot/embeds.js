import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const TYPE_COLORS = {
  gather: 0xC8922A,
  farm:   0x2A6B2A,
  deliver:0x1E3A6B,
  craft:  0x4A2070,
  event:  0xCC5500,
};

const TYPE_ICONS = {
  gather: '⛏',
  farm:   '🌾',
  deliver:'📦',
  craft:  '🔨',
  event:  '🎪',
};

const TYPE_LABELS = {
  gather: 'GATHER',
  farm:   'FARM',
  deliver:'DELIVER',
  craft:  'CRAFT',
  event:  'EVENT',
};

function getQuestUrl(baseUrl, id) {
  return `${baseUrl}/#quest-${id}`;
}

function formatRewards(q) {
  const parts = [];
  if (q.pointsValue && q.rewards?.includes('points')) {
    parts.push(`🏅 **${q.pointsValue} Guild Points**`);
  }
  if (q.rewards?.includes('hot')) {
    parts.push('🔥 **Hot Deal**');
  }
  if (q.rewards?.includes('gift') && q.rewardNote) {
    parts.push(`🎁 ${q.rewardNote}`);
  }
  return parts.length ? parts.join(' | ') : 'None';
}

function statusEmoji(status) {
  const map = {
    pending: '⏳',
    open: '✅',
    claimed: '👤',
    complete: '✔️',
    cancelled: '❌',
  };
  return map[status] || '❓';
}

function statusLabel(status) {
  const map = {
    pending: 'Pending Approval',
    open: 'Open for Claims',
    claimed: 'Claimed',
    complete: 'Completed',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}

export function buildQuestEmbed(q, baseUrl) {
  const color = TYPE_COLORS[q.type] || 0x888888;
  const icon = TYPE_ICONS[q.type] || '📜';
  const typeLabel = TYPE_LABELS[q.type] || 'QUEST';
  const url = getQuestUrl(baseUrl, q.id);
  const emoji = statusEmoji(q.status);
  const label = statusLabel(q.status);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${icon} [${typeLabel}] ${q.title}`)
    .setURL(url)
    .setTimestamp(new Date())
    .setFooter({ text: `ID: ${q.id.slice(0, 8)}…` });

  if (q.description) {
    embed.setDescription(q.description);
  }

  const fields = [];

  if (q.item) {
    fields.push({ name: '📦 Item', value: q.item + (q.qty ? ` × ${q.qty}` : ''), inline: true });
  }
  if (q.deliverTo) {
    fields.push({ name: '📍 Deliver To', value: q.deliverTo, inline: true });
  }
  if (q.deadline) {
    fields.push({ name: '⏰ Deadline', value: q.deadline, inline: true });
  }
  fields.push({ name: '👤 Posted By', value: q.poster || 'Unknown', inline: true });
  fields.push({ name: '🏅 Rewards', value: formatRewards(q), inline: false });
  fields.push({ name: `${emoji} Status`, value: label + (q.claimedBy ? ` — ${q.claimedBy}` : ''), inline: false });

  embed.addFields(fields);

  return embed;
}

export function buildShopPurchaseEmbed(purchase, baseUrl) {
  const embed = new EmbedBuilder()
    .setColor(0xc8922a)
    .setTitle('\uD83D\uDED2 New Shop Purchase')
    .setDescription(`**${purchase.player_name}** bought **${purchase.item_name}** for **${purchase.price} pts**`)
    .addFields(
      { name: '👤 Player', value: purchase.player_name, inline: true },
      { name: '\uD83C\uDFAE Discord ID', value: /^\d+$/.test(purchase.discord_id) ? `<@${purchase.discord_id}>` : (purchase.discord_id || '—'), inline: true },
      { name: '\uD83D\uDCE6 Item', value: purchase.item_name, inline: true },
      { name: '\uD83D\uDCB0 Price', value: `${purchase.price} pts`, inline: true },
    )
    .setFooter({ text: `ID: ${purchase.id.slice(0, 8)}…` })
    .setTimestamp(new Date());

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('\uD83D\uDCCB Pending Purchases')
      .setStyle(ButtonStyle.Link)
      .setURL(`${baseUrl}/#pending-purchases`)
  );

  return { embeds: [embed], components: [row] };
}

export function buildQuestComponents(q, baseUrl) {
  const url = getQuestUrl(baseUrl, q.id);
  const row = new ActionRowBuilder();

  if (q.status === 'open') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`claim_quest:${q.id}`)
        .setLabel('✅ Claim Quest')
        .setStyle(ButtonStyle.Success)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setLabel('🔗 View in Browser')
      .setStyle(ButtonStyle.Link)
      .setURL(url)
  );

  return [row];
}
