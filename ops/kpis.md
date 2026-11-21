# KPIs

Defined by analytics-lead. Sources: Umami (U), Vercel Web Analytics (V, page views only, no custom events on Hobby), Speed Insights (S), `/admin/pulse` and Supabase (P). Event wiring: `src/lib/analytics.ts`.

| KPI | Definition | Source |
|---|---|---|
| Weekly visitors | Unique visitors, Mon–Sun | U / V |
| Returning visitors % | Visitors seen in a previous week ÷ weekly visitors | U |
| Memes made | `meme_created` events | U events |
| Memes published | Approved new memes in the feed | P |
| Battle entries / votes | `battle_entry` events; votes from Supabase | U / P |
| Game plays | `game_started {game}`, plus `prank_started {prank}` and `guess_the_meme_played` | U events |
| Shares | `share_clicked {channel}` | U events |
| Share-driven visits | Visits landing with `?ref=share` | U |
| Bounce % (top landings) | Prank screens, meme generator, home | U |
| Core Web Vitals | LCP / INP / CLS p75, mobile | S |
| Cost per 1,000 visits | Monthly spend ÷ (monthly visits ÷ 1,000) | `budget.md` + U |

Anything not measurable yet is reported as **not measured**, never estimated without saying so.
