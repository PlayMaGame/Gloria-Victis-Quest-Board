import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL")!;

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
}

function fmt(q: DbRow): string {
  const p: string[] = [];
  if (q.rewards?.includes("hot")) p.push("\ud83d\udd25 Hot Deal");
  if (q.rewards?.includes("points")) p.push("\ud83c\udfc5 " + (q.points_value || "") + " Guild Points");
  if (q.rewards?.includes("gift")) p.push("\ud83c\udf81 Gift");
  if (q.reward_note) p.push(q.reward_note);
  return p.length ? p.join(" \u00b7 ") : "\u200b";
}

function buildFields(q: DbRow) {
  const f: { name: string; value: string; inline: boolean }[] = [];
  if (q.type !== "event") {
    if (q.item) f.push({ name: "Item", value: q.item, inline: true });
    if (q.qty) f.push({ name: "Qty", value: q.qty, inline: true });
  }
  if (q.deliver_to) f.push({ name: q.type === "event" ? "Location" : "Deliver To", value: q.deliver_to, inline: false });
  if (q.deadline) f.push({ name: q.type === "event" ? "Start Time" : "Deadline", value: q.deadline, inline: false });
  if (q.claimed_by) f.push({ name: "Claimed By", value: q.claimed_by, inline: false });
  if (q.type === "event" && q.participants?.length) f.push({ name: "Participants", value: q.participants.join(", "), inline: false });
  return f;
}

function embed(q: DbRow, overrides?: { title?: string; color?: number; desc?: string; fields?: any[] }) {
  const icon = TYPE_ICONS[q.type] || "\ud83d\udcdc";
  const label = q.type.charAt(0).toUpperCase() + q.type.slice(1);
  return {
    title: overrides?.title ?? q.title,
    color: overrides?.color ?? TYPE_COLORS[q.type] ?? 0x888888,
    description: overrides?.desc ?? (q.description ? q.description.slice(0, 400) : undefined),
    fields: overrides?.fields ?? [
      { name: "Type", value: icon + " " + label, inline: true },
      { name: "Posted By", value: q.poster || "\u200b", inline: true },
      ...buildFields(q),
      { name: "Rewards", value: fmt(q), inline: false },
    ],
    footer: { text: "Status: " + (q.status || "open").toUpperCase() },
    timestamp: q.posted_at || new Date().toISOString(),
  };
}

async function postDiscord(body: object) {
  const r = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) console.error("Discord error:", r.status, await r.text());
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
          title: "\u23f3 New Quest \u2014 Pending Approval\n" + q.title,
          color: 0xffaa00,
          desc: (q.description || "") + "\n\n_Quest is awaiting admin approval._",
        })] });
      } else if (q.status === "open") {
        await postDiscord({ embeds: [embed(q, { title: "\ud83d\udcdc New Quest Posted\n" + q.title })] });
      }
    } else if (ev === "UPDATE" && oq && q.status !== oq.status) {
      if (oq.status === "pending" && q.status === "open") {
        await postDiscord({ embeds: [embed(q, { title: "\u2705 Quest Approved!\n" + q.title, color: 0x3a9a3a })] });
      } else if (q.status === "claimed") {
        await postDiscord({ embeds: [embed(q, {
          title: "\ud83d\udc46 Quest Claimed\n" + q.title, color: 0x4a7abf,
          fields: [
            { name: "Type", value: (TYPE_ICONS[q.type] || "\ud83d\udcdc") + " " + (q.type.charAt(0).toUpperCase() + q.type.slice(1)), inline: true },
            { name: "Posted By", value: q.poster || "\u200b", inline: true },
            { name: "Claimed By", value: q.claimed_by || "\u2014", inline: false },
          ],
        })] });
      } else if (q.status === "complete") {
        await postDiscord({ embeds: [{
          title: "\ud83d\udfe2 Quest Completed \u2014 " + q.title,
          color: 0x3a9a3a,
          description: "**" + q.title + "** has been marked as complete!",
          fields: [
            { name: "Type", value: (TYPE_ICONS[q.type] || "\ud83d\udcdc") + " " + (q.type.charAt(0).toUpperCase() + q.type.slice(1)), inline: true },
            { name: "Posted By", value: q.poster || "\u200b", inline: true },
            ...(q.claimed_by ? [{ name: "Completed By", value: q.claimed_by, inline: true }] : []),
            ...(q.points_value && q.claimed_by ? [{ name: "Points Awarded", value: q.points_value + " to " + q.claimed_by, inline: true }] : []),
          ],
          timestamp: new Date().toISOString(),
        }] });
      } else if (q.status === "cancelled") {
        await postDiscord({ embeds: [{
          title: "\u274c Quest Cancelled \u2014 " + q.title,
          color: 0xcc4444,
          description: "**" + q.title + "** has been cancelled.",
          timestamp: new Date().toISOString(),
        }] });
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("discord-notify error:", err);
    return new Response("error", { status: 500 });
  }
});
