# Gloria Victis — Guild Quest Board

A live, shared quest board for Gloria Victis guilds. Members can post gather, farm, deliver, and craft requests with rewards, claim them, and mark them complete — all synced in real time via Supabase.

Single HTML file. No build step. No server. Deployable to GitHub Pages in minutes.

---

## Features

- **Post quests** — title, type, item, quantity, delivery target, deadline, description
- **Reward types** — Guild Points, Giveaway Tickets, Gifts, Production Priority
- **Claim system** — members enter their in-game name to claim a quest; board updates for everyone instantly
- **Status flow** — Open → Claimed → Complete
- **Filters** — by status or quest type (Gather / Farm / Deliver / Craft / Other)
- **Real-time sync** — Supabase Realtime pushes changes to all connected browsers instantly
- **No login required** — anyone with the link can post and claim

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
  desc text,
  item text,
  qty text,
  deliver_to text,
  deadline text,
  poster text,
  rewards text[],
  reward_note text,
  status text default 'open',
  claimed_by text,
  posted_at timestamptz default now()
);
```

```sql
alter table quests enable row level security;
```

```sql
create policy "public access" on quests
  for all using (true) with check (true);
```

5. Go to **Project Settings → API** and copy:
   - **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** key — the long `eyJ...` string

### 2. GitHub Pages

1. Upload `index.html` to this repository (root, main branch)
2. Go to **Settings → Pages → Source: Deploy from branch → main / root**
3. GitHub will publish the site at `https://playmagame.github.io/Gloria-Victis-Quest-Board/`

---

## Quest Types

| Type | Colour | Use for |
|---|---|---|
| ⛏ Gather | Gold | Mining, gathering raw resources |
| 🌾 Farm | Green | Farming crops, animals, repeatable grinding |
| 📦 Deliver | Blue | Moving items between players or locations |
| 🔨 Craft | Purple | Crafting requests where materials are provided |
| 📜 Other | Grey | Anything else |

---

## Reward Types

- 🏅 **Guild Points** — tracked manually by officers
- 🎟 **Giveaway Ticket** — entry into guild giveaways
- 🎁 **Gift / Item** — specific item reward, detail in the notes field
- ⭐ **Production Priority** — priority slot in the next crafting/production cycle

---

## File Structure

```
index.html         ← entire app (HTML + CSS + JS, single file)
quest-board.html   ← source file (same as index.html)
README.md          ← this file
```

---

---

## License

Free to use and modify for guild purposes.
