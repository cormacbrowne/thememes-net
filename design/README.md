# design/: brand and design system (owner: design-director)

The design system lives in code. This folder holds the rules and art direction that sit around it.

- **Tokens:** `src/index.css` (`--tm-*`). Colour roles and palette: `instructions.md` 34.B and 35.2 (35.2 wins where they differ).
- **Rules for every UI change:** `instructions.md` 34.G.
- **Reference screens:** `docs/ui/`.
- **AI image style:** `ai-image-style.md` (spec for image-studio).

## Brand in five lines
1. One neon sign in a dark room: calm dark surfaces, neon only where the eye should go.
2. Pink = main action (one per screen). Cyan = navigation, links, focus. Amber = money and rewards only. Green = success. Red = danger. UV = background glow only.
3. Orbitron for titles and signs, Outfit for body, Oxanium for canvas labels, pixel faces only for tiny arcade labels.
4. Motion gives feedback; it doesn't decorate. Loud only on reward. Reduced motion, Calm mode and lite mode always win.
5. Mobile first: design at 390×844, then check 768×1024 and 1280×800.

## Ads (for later, monetisation Stage 1+)
- Never over or inside a game, the meme being viewed, the share sheet, report buttons, or the main action.
- Allowed zones (to design before Stage 1): between feed cards (no more than 1 in 8), below article-style SEO text, the footer.
- Ads are always visibly labelled, never styled like content or buttons, and never autoplay sound.
- Ad slots reserve their height so nothing jumps (CLS).

## Accessibility checklist
4.5:1 text contrast · visible cyan focus ring · keyboard path (Tab/Enter/Esc) · `prefers-reduced-motion` · alt text on every content image · touch targets ≥ 44 px.
