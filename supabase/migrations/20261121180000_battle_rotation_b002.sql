-- Batch B002: point future Daily Caption Battles at the new AI images and neutral titles.
-- New filenames mean battles already live or finished keep their original picture.
-- template_id stays the same because Hall of Fame looks templates up by that id.
-- Revert: restore auto_templates from 20261120144742_daily_battles_v2.sql.

update public.battle_settings
set auto_templates = '[
  ["tpl-drake-compare", "/seed/battle-otter-nope-yes.webp", "Nope / Yes Otter"],
  ["tpl-expanding-brain", "/seed/battle-cosmic-snail.webp", "Cosmic Snail"],
  ["tpl-two-buttons", "/seed/battle-panicking-robot.webp", "Panicking Robot"],
  ["tpl-distracted-choice", "/seed/battle-distracted-magpie.webp", "Distracted Magpie"],
  ["tpl-this-is-fine", "/seed/battle-calm-capybara.webp", "Calm in the Chaos"],
  ["tpl-change-my-mind", "/seed/battle-hot-take-pigeon.webp", "Hot Take Booth"],
  ["tpl-buff-vs-smol", "/seed/battle-buff-hamster.webp", "Buff vs Smol"],
  ["tpl-stonks-up", "/seed/battle-smug-beaver.webp", "Line Goes Up"],
  ["tpl-not-stonks", "/seed/battle-stunned-beaver.webp", "Line Goes Down"],
  ["tpl-woman-yelling-cat", "/seed/battle-goose-hedgehog.webp", "Goose vs Unbothered Hedgehog"],
  ["tpl-gigachad-verdict", "/seed/battle-unbothered-ram.webp", "Unbothered Verdict"],
  ["tpl-clown-makeup", "/seed/battle-clown-penguin.webp", "4-Step Clown Protocol"],
  ["tpl-always-has-been", "/seed/battle-old-lemur.webp", "It Was Always This Way"],
  ["tpl-brain-at-3am", "/seed/battle-3am-cat.webp", "Brain At 3 AM"],
  ["tpl-surprised-shock", "/seed/battle-surprised-owl.webp", "Surprised Owl"],
  ["tpl-trade-offer", "/seed/battle-dodgy-octopus.webp", "Dodgy Deal"],
  ["tpl-bell-curve-iq", "/seed/battle-bell-curve-sheep.webp", "Bell Curve Sheep"],
  ["tpl-highway-exit", "/seed/battle-exit-tortoise.webp", "Last-Second Exit"],
  ["tpl-spiderman-point", "/seed/battle-copycat-crabs.webp", "Copycat Crabs"],
  ["tpl-trophy-celebration", "/seed/battle-trophy-mouse.webp", "Over-Celebrating 3rd Place"]
]'::jsonb,
    updated_at = now()
where id;

-- A battle may already be queued for a future day. Update only automatic, not-yet-started ones.
update public.battles b
set image_url = t.item ->> 1,
    title = t.item ->> 2
from public.battle_settings s
cross join lateral jsonb_array_elements(s.auto_templates) as t(item)
where s.id
  and b.status = 'scheduled'
  and b.source = 'auto'
  and b.starts_at > now()
  and b.template_id = t.item ->> 0;
