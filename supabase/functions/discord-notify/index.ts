import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOARD_URL = "https://PlayMaGame.github.io/Gloria-Victis-Quest-Board/quest-board.html";
const SUPABASE_URL = "https://dnwitnnzrkcismsbxfcg.supabase.co";
const LANG = "ru";

const T: Record<string, Record<string, string>> = {
  en: {
    type: "Type", posted_by: "Posted By", item: "Item", qty: "Qty",
    deliver_to: "Deliver To", location: "Location", deadline: "Deadline",
    start_time: "Start Time", claimed_by: "Claimed By", rewards: "Rewards",
    completed_by: "Completed By", points_awarded: "Points Awarded",
    participants: "Participants", voice_channel: "Voice Channel",
    hot_deal: "\ud83d\udd25 Hot Deal", guild_points: "\ud83c\udfc5 Guild Points", gift: "\ud83c\udf81 Gift",
    coin_gold: "\ud83d\udfe1", coin_silver: "\u26aa", coin_iron: "\ud83d\udfe4", coin_copper: "\ud83d\udfe0",
    status: "Status",
    quest_pending: "\u23f3 New Quest \u2014 Pending Approval",
    quest_new: "\ud83d\udcdc New Quest Posted",
    quest_approved: "\u2705 Quest Approved!",
    quest_claimed: "\ud83d\udc46 Quest Claimed",
    quest_completed: "\ud83d\udfe2 Quest Completed \u2014 ",
    quest_cancelled: "\u274c Quest Cancelled \u2014 ",
    completed_desc: "**{title}** has been marked as complete!",
    cancelled_desc: "**{title}** has been cancelled.",
    pending_desc: "_Quest is awaiting admin approval._",
  },
  ru: {
    type: "\u0422\u0438\u043f", posted_by: "\u0410\u0432\u0442\u043e\u0440", item: "\u041f\u0440\u0435\u0434\u043c\u0435\u0442",
    qty: "\u041a\u043e\u043b-\u0432\u043e", deliver_to: "\u0414\u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c",
    location: "\u041c\u0435\u0441\u0442\u043e", deadline: "\u0421\u0440\u043e\u043a",
    start_time: "\u041d\u0430\u0447\u0430\u043b\u043e", claimed_by: "\u0412\u0437\u044f\u043b(\u0430)",
    rewards: "\u041d\u0430\u0433\u0440\u0430\u0434\u044b", completed_by: "\u0412\u044b\u043f\u043e\u043b\u043d\u0438\u043b(\u0430)",
    points_awarded: "\u041d\u0430\u0447\u0438\u0441\u043b\u0435\u043d\u043e \u043e\u0447\u043a\u043e\u0432",
    participants: "\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438", voice_channel: "\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439",
    hot_deal: "\ud83d\udd25 \u0413\u043e\u0440\u044f\u0447\u0435\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435",
    guild_points: "\ud83c\udfc5 \u041e\u0447\u043a\u0438 \u0433\u0438\u043b\u044c\u0434\u0438\u0438",
    coin_gold: "\ud83d\udfe1", coin_silver: "\u26aa", coin_iron: "\ud83d\udfe4", coin_copper: "\ud83d\udfe0",
    gift: "\ud83c\udf81 \u041f\u043e\u0434\u0430\u0440\u043e\u043a",
    status: "\u0421\u0442\u0430\u0442\u0443\u0441",
    quest_pending: "\u23f3 \u041d\u043e\u0432\u044b\u0439 \u0437\u0430\u043f\u0440\u043e\u0441 \u2014 \u041e\u0436\u0438\u0434\u0430\u0435\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f",
    quest_new: "\ud83d\udcdc \u041d\u043e\u0432\u044b\u0439 \u0437\u0430\u043f\u0440\u043e\u0441 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d",
    quest_approved: "\u2705 \u0417\u0430\u043f\u0440\u043e\u0441 \u043e\u0434\u043e\u0431\u0440\u0435\u043d!",
    quest_claimed: "\ud83d\udc46 \u0417\u0430\u043f\u0440\u043e\u0441 \u0432\u0437\u044f\u0442",
    quest_completed: "\ud83d\udfe2 \u0417\u0430\u043f\u0440\u043e\u0441 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d \u2014 ",
    quest_cancelled: "\u274c \u0417\u0430\u043f\u0440\u043e\u0441 \u043e\u0442\u043c\u0435\u043d\u0451\u043d \u2014 ",
    completed_desc: "**{title}** \u043e\u0442\u043c\u0435\u0447\u0435\u043d \u043a\u0430\u043a \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u0439!",
    cancelled_desc: "**{title}** \u043e\u0442\u043c\u0435\u043d\u0451\u043d.",
    pending_desc: "_Запрос ожидает подтверждения администратора._",
  },
};

const TYPE_COLORS: Record<string, number> = {
  gather: 0xc8922a, farm: 0x3a9a3a, deliver: 0x4a7abf, craft: 0x8040c0, event: 0xe08030,
};
const TYPE_ICONS: Record<string, string> = {
  gather: "\u26cf", farm: "\ud83c\udf3e", deliver: "\ud83d\udce6", craft: "\ud83d\udd28", event: "\ud83c\udfaa",
};

interface DbRow {
  id: number; title: string; type: string; description: string;
  item: string; qty: string; deliver_to: string; deadline: string;
  poster: string; rewards: string[]; reward_note: string; status: string;
  claimed_by: string | null; posted_at: string; participants: any[]; points_value: number;
  discord_id: string; voice_channel: string; discord_message_id: string;
  reward_gold: number; reward_silver: number; reward_iron: number; reward_copper: number;
}

function parseWebhookUrl(url: string): { id: string; token: string } | null {
  const m = url.match(/\/api\/webhooks\/(\d+)\/([^/?#]+)/);
  return m ? { id: m[1], token: m[2] } : null;
}

function t(key: string): string {
  return T[LANG]?.[key] ?? T["en"]?.[key] ?? key;
}

function formatDeadline(deadline: string, qType: string): string {
  if (!deadline) return "";
  const ms = Date.parse(deadline);
  if (!isNaN(ms)) {
    const unix = Math.floor(ms / 1000);
    return qType === "event" ? `<t:${unix}:f> (<t:${unix}:R>)` : `<t:${unix}:f>`;
  }
  return deadline;
}

function fmt(q: DbRow): string {
  const p: string[] = [];
  if (q.rewards?.includes("hot")) p.push(t("hot_deal"));
  if (q.rewards?.includes("points")) p.push("\ud83c\udfc5 " + (q.points_value || "") + " " + (LANG === "ru" ? "\u043e\u0447\u043a." : "pts"));
  if (q.rewards?.includes("gift")) p.push(t("gift"));
  if (q.reward_note) p.push(q.reward_note);
  const coins: string[] = [];
  if (q.reward_gold) coins.push(t("coin_gold") + " " + q.reward_gold);
  if (q.reward_silver) coins.push(t("coin_silver") + " " + q.reward_silver);
  if (q.reward_iron) coins.push(t("coin_iron") + " " + q.reward_iron);
  if (q.reward_copper) coins.push(t("coin_copper") + " " + q.reward_copper);
  if (coins.length) p.push(coins.join(" "));
  return p.length ? p.join(" \u00b7 ") : "\u200b";
}

function parsePart(p: any): { name: string; dig: string } {
  if (typeof p === "string") {
    try { const o = JSON.parse(p); return { name: o.name || p, dig: o.discord_id || "" }; } catch (e) { return { name: p, dig: "" }; }
  }
  return { name: p?.name || "", dig: p?.discord_id || "" };
}

function formatParticipants(list: any[]): string {
  if (!list?.length) return "0";
  return list.map(p => {
    const { name, dig } = parsePart(p);
    return dig && /^\d+$/.test(dig) ? `<@${dig}>` : name;
  }).join(", ");
}

function posterName(q: DbRow): string {
  return q.discord_id ? `<@${q.discord_id}>` : (q.poster || "\u200b");
}

function buildFields(q: DbRow) {
  const f: { name: string; value: string; inline: boolean }[] = [];
  if (q.type !== "event") {
    if (q.item) f.push({ name: t("item"), value: q.item, inline: true });
    if (q.qty) f.push({ name: t("qty"), value: q.qty, inline: true });
  }
  const locLabel = q.type === "event" ? t("location") : t("deliver_to");
  if (q.deliver_to) f.push({ name: locLabel, value: q.deliver_to, inline: false });
  if (q.deadline) {
    const dlLabel = q.type === "event" ? t("start_time") : t("deadline");
    f.push({ name: dlLabel, value: formatDeadline(q.deadline, q.type), inline: false });
  }
  if (q.voice_channel) {
    const vc = /^\d+$/.test(q.voice_channel) ? `<#${q.voice_channel}>` : q.voice_channel;
    f.push({ name: t("voice_channel"), value: vc, inline: false });
  }
  if (q.claimed_by) f.push({ name: t("claimed_by"), value: q.claimed_by, inline: false });
  if (q.type === "event") {
    const pCount = (q.participants || []).length;
    f.push({ name: t("participants") + ` (${pCount})`, value: formatParticipants(q.participants || []), inline: false });
  }
  return f;
}

function embed(q: DbRow, overrides?: { title?: string; color?: number; desc?: string; fields?: any[] }) {
  const icon = TYPE_ICONS[q.type] || "\ud83d\udcdc";
  const label = LANG === "ru"
    ? ({ gather: "\u0421\u0431\u043e\u0440", farm: "\u0424\u0435\u0440\u043c\u0430", deliver: "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430", craft: "\u041a\u0440\u0430\u0444\u0442", event: "\u0418\u0432\u0435\u043d\u0442" }[q.type] || q.type)
    : q.type.charAt(0).toUpperCase() + q.type.slice(1);
  const statusMap: Record<string, string> = {
    pending: LANG === "ru" ? "\u041e\u0416\u0418\u0414\u0410\u0415\u0422" : "PENDING",
    open: LANG === "ru" ? "\u041e\u0422\u041a\u0420\u042b\u0422" : "OPEN",
    claimed: LANG === "ru" ? "\u0412\u0417\u042f\u0422" : "CLAIMED",
    complete: LANG === "ru" ? "\u0412\u042b\u041f\u041e\u041b\u041d\u0415\u041d" : "COMPLETE",
    cancelled: LANG === "ru" ? "\u041e\u0422\u041c\u0415\u041d\u0401\u041d" : "CANCELLED",
  };
  return {
    title: overrides?.title ?? q.title,
    color: overrides?.color ?? TYPE_COLORS[q.type] ?? 0x888888,
    description: overrides?.desc ?? (q.description ? q.description.slice(0, 400) : undefined),
    fields: overrides?.fields ?? [
      { name: t("type"), value: icon + " " + label, inline: true },
      { name: t("posted_by"), value: posterName(q), inline: true },
      ...buildFields(q),
      ...(fmt(q) !== "\u200b" ? [{ name: t("rewards"), value: fmt(q), inline: false }] : []),
    ],
    footer: { text: t("status") + ": " + (statusMap[q.status] || q.status.toUpperCase()) },
    timestamp: q.posted_at || new Date().toISOString(),
  };
}

function linkButtons(q: DbRow): object[] {
  const btns: object[] = [
    { type: 2, style: 5, label: LANG === "ru" ? "\ud83d\udd17 \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0434\u043e\u0441\u043a\u0443" : "\ud83d\udd17 Open Board", url: BOARD_URL },
  ];
  if (q.type === "event") {
    btns.push({ type: 2, style: 5, label: LANG === "ru" ? "\ud83d\udcdd \u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f" : "\ud83d\udcdd Register", url: BOARD_URL + "#quest-" + q.id });
  }
  return [{ type: 1, components: btns }];
}

async function patchDiscordMessage(q: DbRow, embedData: object): Promise<boolean> {
  const wh = parseWebhookUrl(DISCORD_WEBHOOK_URL);
  if (!wh || !q.discord_message_id) return false;
  const url = `https://discord.com/api/webhooks/${wh.id}/${wh.token}/messages/${q.discord_message_id}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...embedData, components: linkButtons(q) }),
  });
  return r.ok;
}

async function postAndStore(q: DbRow, embedData: object): Promise<string | null> {
  const msg: any = { ...embedData, components: linkButtons(q) };
  if (q.type === "event") {
    msg.content = "@everyone";
  } else if (q.discord_id) {
    msg.content = `<@${q.discord_id}>`;
  }
  const r = await fetch(DISCORD_WEBHOOK_URL + "?wait=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
  if (!r.ok) {
    console.error("Discord error:", r.status, await r.text());
    return null;
  }
  const data = await r.json();
  const msgId = data.id as string;
  if (q.type === "event" && msgId) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/quests?id=eq.${q.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ discord_message_id: msgId }),
      });
    } catch (e) {
      console.error("Failed to store message_id:", e);
    }
  }
  return msgId;
}

function typeLabel(q: DbRow): string {
  const icon = TYPE_ICONS[q.type] || "\ud83d\udcdc";
  const name = LANG === "ru"
    ? ({ gather: "\u0421\u0431\u043e\u0440", farm: "\u0424\u0435\u0440\u043c\u0430", deliver: "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430", craft: "\u041a\u0440\u0430\u0444\u0442", event: "\u0418\u0432\u0435\u043d\u0442" }[q.type] || q.type)
    : q.type.charAt(0).toUpperCase() + q.type.slice(1);
  return icon + " " + name;
}

function partsChanged(q: DbRow, oq: DbRow | null): boolean {
  if (!oq) return false;
  return JSON.stringify(q.participants || []) !== JSON.stringify(oq.participants || []);
}

serve(async (req) => {
  try {
    const p = await req.json();
    const ev = p.type as string;
    const q = p.record as DbRow | undefined;
    const oq = p.old_record as DbRow | null | undefined;
    if (!q) return new Response("no record", { status: 200 });

    if (ev === "INSERT") {
      const isEvent = q.type === "event";
      if (q.status === "pending") {
        await postAndStore(q, { embeds: [embed(q, {
          title: t("quest_pending") + "\n" + q.title,
          color: 0xffaa00,
          desc: (q.description || "") + "\n\n" + t("pending_desc"),
        })] });
      } else if (q.status === "open") {
        await postAndStore(q, { embeds: [embed(q, { title: (isEvent ? "\ud83c\udfaa " : "\ud83d\udcdc ") + t("quest_new") + "\n" + q.title })] });
      }
    } else if (ev === "UPDATE" && oq) {
      const isEvent = q.type === "event";
      const hasMsgId = !!q.discord_message_id;

      if (isEvent && hasMsgId && partsChanged(q, oq)) {
        const title = q.status === "open" ? t("quest_new") : t("quest_pending");
        await patchDiscordMessage(q, { embeds: [embed(q, { title: "\ud83c\udfaa " + title + "\n" + q.title })] });
      } else if (q.status !== oq.status) {
        if (oq.status === "pending" && q.status === "open") {
          if (isEvent && hasMsgId) {
            await patchDiscordMessage(q, { embeds: [embed(q, { title: "\u2705 " + t("quest_approved") + "\n" + q.title, color: 0x3a9a3a })] });
          } else {
            await postAndStore(q, { embeds: [embed(q, { title: t("quest_approved") + "\n" + q.title, color: 0x3a9a3a })] });
          }
        } else if (q.status === "claimed") {
          await postAndStore(q, { embeds: [embed(q, {
            title: t("quest_claimed") + "\n" + q.title, color: 0x4a7abf,
            fields: [
              { name: t("type"), value: typeLabel(q), inline: true },
              { name: t("posted_by"), value: posterName(q), inline: true },
              { name: t("claimed_by"), value: q.claimed_by || "\u2014", inline: false },
            ],
          })] });
        } else if (q.status === "complete") {
          await postAndStore(q, { embeds: [{
            title: t("quest_completed") + q.title,
            color: 0x3a9a3a,
            description: t("completed_desc").replace("{title}", q.title),
            fields: [
              { name: t("type"), value: typeLabel(q), inline: true },
              { name: t("posted_by"), value: posterName(q), inline: true },
              ...(q.claimed_by ? [{ name: t("completed_by"), value: q.claimed_by, inline: true }] : []),
              ...(q.points_value && q.claimed_by ? [{ name: t("points_awarded"), value: q.points_value + " \u2014 " + q.claimed_by, inline: true }] : []),
            ],
            timestamp: new Date().toISOString(),
          }] });
        } else if (q.status === "cancelled") {
          await postAndStore(q, { embeds: [{
            title: t("quest_cancelled") + q.title,
            color: 0xcc4444,
            description: t("cancelled_desc").replace("{title}", q.title),
            timestamp: new Date().toISOString(),
          }] });
        }
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("discord-notify error:", err);
    return new Response("error", { status: 500 });
  }
});
