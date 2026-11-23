# Backlog: everything not done yet

First pass by Max, 23 Nov 2026. Built from `THEMEMES_IMPLEMENTATION_PLAN.md`, `docs/HANDOFF.md`, `docs/OWNER_TODO.md`, `ops/decisions.md`, `ops/work-board.md`, `assets/README.md`, and a quick search of the code.
**Status key:** ✅ done · 🟡 partly built (code exists, not finished or not checked) · ⬜ not started · 👤 Cormac only.
**Lane:** C = Claude Code · G = Gemini (Antigravity) · C→G = Claude writes the spec, Gemini builds, Claude reviews.
Statuses marked 🟡 came from a code search, not a full test. The dispatcher confirms each one before it's scheduled. `docs/HANDOFF.md` (20 Nov) is out of date; much of Phase 2 has been built since.

## A. Urgent (Cormac, 23 Nov)
| # | Item | Status | Lane | Notes |
|---|---|---|---|---|
| A1 | Text-message link goes to the wrong site | ✅ fixed on `claude/youthful-mendel-0wx8uf`, not yet live | C | iPhone turned "THE MEMES.net" into a link to **memes.net**, a different site. The preview card link itself works. Share and invite text now says "thememes.net" (battles, games, pranks, multiplayer invites, footer). Needs QA, then deploy. |
| A2 | Slots: fast "surge" spin stopped working; "SURGE" written twice | ⬜ | G | Brief ready: `ops/handoffs/H-20261123-01-slots-surge.md`. Lead: phones start in lite mode, which turns off reel motion but still shows the SURGE badge. Two different features are both called "Surge". |
| A3 | Agree the standing brief for Gemini code work | ⬜ | 👤 + C | See D-006 in `ops/decisions.md`. |

## B. Time-sensitive (Christmas)
| # | Item | Status | Lane | Notes |
|---|---|---|---|---|
| B1 | 12 Days of Memes battle series, from **13 Dec** | 🟡 config exists (`src/config/seasonal.js`) | C + images | Needs 12 images (image-studio → Gemini app), queued in `/admin/battles` by about 10 Dec. |
| B2 | Christmas seasonal skin (snow) | 🟡 `SEASONAL_SKIN` flag exists, set to `off` | C→G | Design sign-off, then turn it on around 1 Dec. |
| B3 | Festive sound pads (jingle bells, "ho ho ho") | 🟡 | C (audio-director) | Licences logged in `docs/ASSETS.md`. |
| B4 | Secret Santa prank screen | 🟡 | C→G | Check it's finished and clearly labelled as parody. |
| B5 | "Year in Memes" page for New Year | 🟡 | C→G | Real votes only. |

## C. Top priority: images
| # | Item | Status | Lane | Notes |
|---|---|---|---|---|
| C1 | Replace the 64 graphic-style feed images with real AI images | ✅ first pass live 23 Nov (on the 20 B002 pictures); fresh pictures per meme still to come via B001+ | images: Gemini app; curation: C | CLAUDE.md §8 top priority. B001 is waiting for Cormac's Gemini run. |
| C2 | Use the 20 new B002 images in Meme Forge and house memes (battles already use them) | ✅ live 23 Nov | C | Needs its own legal check (D-003). |
| C3 | Replace the otter battle image | ⬜ | images | Due before 7 Dec (T-003). |
| C4 | Review the other 48 library templates | ⬜ | C (legal + design) | Must happen before ads. |
| C5 | Rename recognisable template names and files (D-005, D-003 Finding 5) | ⬜ | C→G (bulk rename) | Must happen before ads. Battle names need a new migration (Claude). |

## D. Plan Phase 2: core loop (mostly built; check, then finish)
| # | Item | Status | Lane |
|---|---|---|---|
| D1 | 2.2 Meme pages and battle pages, plus manual preview checks in WhatsApp, iMessage, Discord and X | 🟡 built; manual checks not done | 👤 checks |
| D2 | 2.3 Guess the Meme share card (countdown exists; results saved per user?) | 🟡 | C→G |
| D3 | 2.4 Streaks, XP, levels, badges, weekly leaderboards | 🟡 config exists (`progression.js`, `badges.js`) | C→G |
| D4 | 2.5 Profiles `/u/<name>` with level, badges, wins, OG image | 🟡 | C→G |
| D5 | 2.6 Moderation gaps: report buttons on battle entries and profiles, configurable N reports, footer links | 🟡 | C (safety stays on Claude) |
| D6 | 2.7 Homepage redesign. Cormac to decide: does the MEMES/PLAY portal stay above the battle card? | 🟡 | 👤 decide, then C→G |
| D7 | 2.8 Social links and admin social kit | 🟡 code done; accounts not created | 👤 create accounts |

## E. Plan Phase 3: growth
| # | Item | Status | Lane |
|---|---|---|---|
| E1 | 3.1 "Make it a video" (vertical 5–10s clip) | 🟡 some recording code in Forge; no `FEATURE_VIDEO_EXPORT` | C→G (big build, good for Gemini) |
| E2 | 3.2 Prank landing pages + `/april-fools` hub | 🟡 pranks exist; no April Fools hub | C→G |
| E3 | 3.3 Template pages `/templates` | ✅ live (49 pages) | — |
| E4 | 3.4 Push notifications (opt-in) and PWA polish | 🟡 manifest exists; no push | C→G; VAPID keys 👤 |
| E5 | 3.5 Weekly email (scaffold only) | ⬜ | C→G; provider 👤 |

## F. Plan Phase 4: ready to make money (all off; needs Vercel Pro first)
| # | Item | Status | Lane |
|---|---|---|---|
| F1 | Ad slots + consent banner + `docs/ADS_SETUP.md` | ⬜ | C (legal) → G |
| F2 | THE MEMES Pro (Stripe test mode) | ⬜ | C (money stays on Claude) |
| F3 | Cosmetics shop (earned M$ only) | 🟡 | C→G |
| F4 | Sponsored battles scaffold | 🟡 | C→G |
| F5 | Merch interest button | 🟡 | C→G |

## G. Plan Phase 5: polish
| # | Item | Status | Lane |
|---|---|---|---|
| G1 | Microcopy pass in the site's voice | ⬜ | C writes → G applies |
| G2 | "Good Vibes Friday" + Wholesome Hero badge | 🟡 | C→G |
| G3 | Accessibility sweep | 🟡 partly done (T-005) | C→G |
| G4 | Arcade: meme games first | ⬜ | C→G |
| G5 | Performance budget check in CI | ⬜ | G |
| G6 | Admin numbers dashboard | ⬜ | C→G |

## H. Cormac only (accounts, settings, money)
| # | Item |
|---|---|
| H1 | Decide D-002 (monthly spend cap), D-004 (Gemini worktree), D-005 (template names), D-006 (Gemini brief) |
| H2 | Umami website ID in Vercel env vars; turn on Vercel Analytics and Speed Insights (check whether already done) |
| H3 | Google Search Console + Bing Webmaster, submit the sitemap (`docs/SEO_SETUP.md`) |
| H4 | Create social accounts, then add their URLs to `src/config/social.js` |
| H5 | Keep or retire the casino games (`FEATURE_CASINO_GAMES`) |
| H6 | Move to Vercel Pro before any ads, affiliate links or monetisation |
| H7 | UK solicitor question on Gemini images before ads (D-003) |
| H8 | Later: Stripe test account, ad networks, email provider, push keys; legal advice before anything near real money |

## I. Housekeeping
| # | Item | Lane |
|---|---|---|
| I1 | Update `docs/HANDOFF.md` and the plan checkboxes to match what's actually built | C (one pass, cheap) |
| I2 | Work board is missing T-005/T-006 (shipped 22 Nov) | C |
