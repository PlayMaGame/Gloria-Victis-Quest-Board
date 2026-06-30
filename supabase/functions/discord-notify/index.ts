import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL")!;
const BOARD_URL = "https://PlayMaGame.github.io/Gloria-Victis-Quest-Board/quest-board.html";
const LANG = "ru";

const T: Record<string, Record<string, string>> = {
  en: {
    type: "Type", posted_by: "Posted By", item: "Item", qty: "Qty",
    deliver_to: "Deliver To", location: "Location", deadline: "Deadline",
    start_time: "Start Time", claimed_by: "Claimed By", rewards: "Rewards",
    completed_by: "Completed By", points_awarded: "Points Awarded",
    participants: "Participants",
    hot_deal: "\ud83d\udd25 Hot Deal", guild_points: "\ud83c\udfc5 Guild Points", gift: "\ud83c\udf81 Gift",
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
    participants: "\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438",
    hot_deal: "\ud83d\udd25 \u0413\u043e\u0440\u044f\u0447\u0435\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435",
    guild_points: "\ud83c\udfc5 \u041e\u0447\u043a\u0438 \u0433\u0438\u043b\u044c\u0434\u0438\u0438",
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
  claimed_by: string | null; posted_at: string; participants: string[]; points_value: number;
  discord_id: string;
}

function t(key: string): string {
  return T[LANG]?.[key] ?? T["en"]?.[key] ?? key;
}

function formatDeadline(deadline: string, qType: string): string {
  if (!deadline) return "";
  const ms = Date.parse(deadline);
  if (!isNaN(ms)) {
    const unix = Math.floor(ms / 1000);
    if (qType === "event") return `<t:${unix}:f> (<t:${unix}:R>)`;
    return `<t:${unix}:f>`;
  }
  return deadline;
}

function fmt(q: DbRow): string {
  const p: string[] = [];
  if (q.rewards?.includes("hot")) p.push(t("hot_deal"));
  if (q.rewards?.includes("points")) p.push("\ud83c\udfc5 " + (q.points_value || "") + " " + (LANG === "ru" ? "\u043e\u0447\u043a." : "pts"));
  if (q.rewards?.includes("gift")) p.push(t("gift"));
  if (q.reward_note) p.push(q.reward_note);
  return p.length ? p.join(" \u00b7 ") : "\u200b";
}

function buildFields(q: DbRow) {
  const f: { name: string; value: string; inline: boolean }[] = [];
  if (q.type !== "event") {
    if (q.item) f.push({ name: t("item"), value: q.item, inline: true });
    if (q.qty) f.push({ name: t("qty"), value: q.qty, inline: true });
  }
  const label = q.type === "event" ? t("location") : t("deliver_to");
  if (q.deliver_to) f.push({ name: label, value: q.deliver_to, inline: false });
  if (q.deadline) {
    const dlLabel = q.type === "event" ? t("start_time") : t("deadline");
    f.push({ name: dlLabel, value: formatDeadline(q.deadline, q.type), inline: false });
  }
  if (q.claimed_by) f.push({ name: t("claimed_by"), value: q.claimed_by, inline: false });
  if (q.type === "event" && q.participants?.length) {
    f.push({ name: t("participants"), value: q.participants.join(", "), inline: false });
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
      { name: t("rewards"), value: fmt(q), inline: false },
    ],
    footer: { text: t("status") + ": " + (statusMap[q.status] || q.status.toUpperCase()) },
    timestamp: q.posted_at || new Date().toISOString(),
  };
}

function posterName(q: DbRow): string {
  return q.discord_id ? `<@${q.discord_id}>` : (q.poster || "\u200b");
}

function linkButton(): object {
  return { type: 1, components: [{ type: 2, style: 5, label: LANG === "ru" ? "\ud83d\udd17 \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0434\u043e\u0441\u043a\u0443" : "\ud83d\udd17 Open Board", url: BOARD_URL }] };
}

async function postDiscord(body: object, discordId?: string) {
  const msg: any = { ...body, components: [linkButton()] };
  if (discordId) {
    msg.content = `<@${discordId}>`;
  }
  const r = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(msg),
  });
  if (!r.ok) console.error("Discord error:", r.status, await r.text());
}

function typeLabel(q: DbRow): string {
  const icon = TYPE_ICONS[q.type] || "\ud83d\udcdc";
  const name = LANG === "ru"
    ? ({ gather: "\u0421\u0431\u043e\u0440", farm: "\u0424\u0435\u0440\u043c\u0430", deliver: "\u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430", craft: "\u041a\u0440\u0430\u0444\u0442", event: "\u0418\u0432\u0435\u043d\u0442" }[q.type] || q.type)
    : q.type.charAt(0).toUpperCase() + q.type.slice(1);
  return icon + " " + name;
}

serve(async (req) => {
  try {
    const p = await req.json();
    const ev = p.type as string;
    const q = p.record as DbRow | undefined;
    const oq = p.old_record as DbRow | null | undefined;

    if (!q) return new Response("no record", { status: 200 });

    if (ev === "INSERT") {
      if (q.status === "pending") {
        await postDiscord({ embeds: [embed(q, {
          title: t("quest_pending") + "\n" + q.title,
          color: 0xffaa00,
          desc: (q.description || "") + "\n\n" + t("pending_desc"),
        })] }, q.discord_id);
      } else if (q.status === "open") {
        await postDiscord({ embeds: [embed(q, { title: t("quest_new") + "\n" + q.title })] }, q.discord_id);
      }
    } else if (ev === "UPDATE" && oq && q.status !== oq.status) {
      if (oq.status === "pending" && q.status === "open") {
        await postDiscord({ embeds: [embed(q, { title: t("quest_approved") + "\n" + q.title, color: 0x3a9a3a })] }, q.discord_id);
      } else if (q.status === "claimed") {
        await postDiscord({ embeds: [embed(q, {
          title: t("quest_claimed") + "\n" + q.title, color: 0x4a7abf,
          fields: [
            { name: t("type"), value: typeLabel(q), inline: true },
            { name: t("posted_by"), value: posterName(q), inline: true },
            { name: t("claimed_by"), value: q.claimed_by || "\u2014", inline: false },
          ],
        })] }, q.discord_id);
      } else if (q.status === "complete") {
        await postDiscord({ embeds: [{
          title: t("quest_completed") + q.title,
          color: 0x3a9a3a,
          description: t("completed_desc").replace("{title}", q.title),
          fields: [
            { name: t("type"), value: typeLabel(q), inline: true },
            { name: t("posted_by"), value: posterName(q), inline: true },
            ...(q.claimed_by ? [{ name: t("completed_by"), value: q.claimed_by, inline: true }] : []),
            ...(q.points_value && q.claimed_by ? [{ name: t("points_awarded"), value: q.points_value + " — " + q.claimed_by, inline: true }] : []),
          ],
          timestamp: new Date().toISOString(),
        }] }, q.discord_id);
      } else if (q.status === "cancelled") {
        await postDiscord({ embeds: [{
          title: t("quest_cancelled") + q.title,
          color: 0xcc4444,
          description: t("cancelled_desc").replace("{title}", q.title),
          timestamp: new Date().toISOString(),
        }] }, q.discord_id);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("discord-notify error:", err);
    return new Response("error", { status: 500 });
  }
});
