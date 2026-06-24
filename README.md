# Gloria Victis — Guild Quest Board

A live, shared quest board for Gloria Victis guilds. Members can post gather, farm, deliver, and craft requests with rewards, claim them, and mark them complete — all synced in real time via Supabase.

Single HTML file. No build step. No server. Deployable to GitHub Pages in minutes.

---

## Features

- **Post quests** — title, type, item, quantity, delivery target, deadline, description
- **Reward types** — Guild Points, Giveaway Tickets, Gifts, Production Priority
- **Claim system** — members enter their in-game name to claim a quest; board updates for everyone instantly
- **Status flow** — Open → Claimed → Complete
- **Filters** — by status or quest type (Gather / Farm / Deliver / Craft / Event)
- **Event quests** — players register for events; admin closes them and awards loyalty points
- **Leaderboard** — sidebar shows all players ranked by loyalty points
- **Admin controls** — triple-click the crest logo to unlock; edit/delete quests, set rewards, award points
- **Real-time sync** — Supabase Realtime pushes changes to all connected browsers instantly
- **No login required** — anyone with the link can post and claim
- **Русский язык** — переключение языка в правом верхнем углу (Russian language toggle in top-right)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (single file) |
| Database | [Supabase](https://supabase.com) (free tier) |
| Hosting | GitHub Pages |
| Realtime | Supabase Postgres Changes |

---

## Setup

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (any name/region)
3. Make sure **Data API** is enabled under Project Settings → API
4. Open the **SQL Editor** and run these three commands:

```sql
create table quests (
  id uuid primary key default gen_random_uuid(),
  title text,
  type text,
  description text,
  item text,
  qty text,
  deliver_to text,
  deadline text,
  poster text,
  rewards text[],
  reward_note text,
  status text default 'open',
  claimed_by text,
  participants text[] default '{}',
  posted_at timestamptz default now()
);

alter table quests enable row level security;

create policy "public access" on quests
  for all using (true) with check (true);

create table loyalty (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  points integer not null default 0,
  reason text,
  awarded_by text,
  quest_id uuid,
  created_at timestamptz default now()
);

alter table loyalty enable row level security;

create policy "public access" on loyalty
  for all using (true) with check (true);

create table ticker_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image text not null,
  hot boolean default false,
  sort_order integer default 0
);

alter table ticker_items enable row level security;

create policy "public access" on ticker_items
  for all using (true) with check (true);

-- Enable realtime for ticker
alter publication supabase_realtime add table ticker_items;

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  message text not null,
  created_at timestamptz default now()
);
alter table chat_messages enable row level security;
create policy "public access" on chat_messages for all using (true) with check (true);
alter publication supabase_realtime add table chat_messages;

create table shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price integer not null default 0,
  stock integer not null default 1,
  sponsor text default '',
  hot boolean default false,
  created_at timestamptz default now()
);
alter table shop_items enable row level security;
create policy "public access" on shop_items for all using (true) with check (true);
alter publication supabase_realtime add table shop_items;
```

5. Go to **Project Settings → API** and copy:
   - **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** key — the long `eyJ...` string

### 2. GitHub Pages

1. Upload `index.html` to this repository (root, main branch)
2. Go to **Settings → Pages → Source: Deploy from branch → main / root**
3. GitHub will publish the site at `https://playmagame.github.io/Gloria-Victis-Quest-Board/`

### 3. Open the board

The Supabase credentials are already hardcoded — just open the URL and start using it. Click **RU** in the top-right to switch to Russian.

### 4. Admin Access

Triple-click the **crest logo** in the top-left to open the admin login. Default password: `gvadmin2024`

---

## Quest Types

| Type | Colour | Use for |
|---|---|---|
| ⛏ Gather | Gold | Mining, gathering raw resources |
| 🌾 Farm | Green | Farming crops, animals, repeatable grinding |
| 📦 Deliver | Blue | Moving items between players or locations |
| 🔨 Craft | Purple | Crafting requests where materials are provided |
| 🎪 Event | Orange | Guild events, competitions, gatherings |

---

## Reward Types

- 🏅 **Guild Points** — tracked manually by officers
- 🎟 **Giveaway Ticket** — entry into guild giveaways
- 🎁 **Gift / Item** — specific item reward, detail in the notes field
- ⭐ **Production Priority** — priority slot in the next crafting/production cycle

---

## Discord Bot Integration

A standalone Discord bot posts quests to a Discord channel as rich embeds and updates them when quest status changes. Users can claim quests directly from Discord via buttons (role-restricted).

### Architecture

```
[Supabase DB] ──realtime subscription──▶ [Bot (Node.js)] ───▶ [Discord Channel]
                                                    ◀─── [Button interactions]
```

The bot is **independent** — it only reads DB changes and writes Discord messages. It does not touch your HTML or frontend logic.

### 1. Database Migration

Run this SQL in your Supabase SQL Editor to add Discord tracking columns:

```sql
alter table quests add column if not exists discord_message_id text;
alter table quests add column if not exists discord_channel_id text;
```

### 2. Create a Discord Bot

1. Go to https://discord.com/developers/applications and click **New Application**
2. Name it (e.g. "GV Quest Board")
3. Go to **Bot** → **Add Bot** → confirm
4. Under **Token**, click **Reset Token** then **Copy** — this is your `DISCORD_TOKEN`
5. Under **Privileged Gateway Intents**, enable **Server Members Intent** (optional, for role checks)
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: `Send Messages`, `Embed Links`, `Read Message History`, `View Channels`
   - Copy the generated URL, paste in your browser, and invite the bot to your server
7. Right-click your target channel in Discord → **Copy Channel ID** (enable Developer Mode in Discord settings first)

### 3. Configure & Run

```bash
cd bot
cp .env.example .env
# Edit .env with your Discord token, channel ID, and any role IDs
npm install
npm start
```

### 4. Deploy to Railway (Free)

1. Push this repo to GitHub
2. Go to https://railway.app → **New Project** → **Deploy from GitHub repo**
3. Select this repository
4. Add environment variables (from `.env.example`) under **Variables**
5. Set the **Start Command** to: `cd bot && npm start`
6. Railway will keep the bot online 24/7 within the free tier (~$1-2/mo)

### Configuration (.env)

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your bot token from Discord Developer Portal |
| `DISCORD_CHANNEL_ID` | ID of the channel to post quests in |
| `ALLOWED_ROLE_IDS` | (Optional) Comma-separated Discord role IDs that can claim. Leave empty for all. |
| `SUPABASE_URL` | Already set — your Supabase project URL |
| `SUPABASE_KEY` | Already set — your Supabase anon key |
| `BASE_URL` | Your GitHub Pages URL |

---

## File Structure

```
index.html         ← entire app (HTML + CSS + JS, single file)
quest-board.html   ← source file (same as index.html)
bot/               ← Discord bot (Node.js + discord.js)
  index.js         ← main entry point
  embeds.js        ← Discord embed builders
  package.json     ← dependencies
  .env.example     ← configuration template
  migration.sql    ← database migration
README.md          ← this file
```

---

## License

Free to use and modify for guild purposes.
