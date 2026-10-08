# SoloScape WebClient — Cache-Only Agent Rules

Follow the repository-root `AGENTS.md` editing workflow and cache-only
source-of-truth rules. These apply to ALL code agents touching `WebClient/`.

## Non-negotiable visual asset policy

- All RuneScape gameplay UI art must come from verified, decoded JS5 assets.
  Cache 3 supplies interface/widget definitions; 8 supplies sprite pixels;
  13 supplies font metrics. Source models, textures and UI state from their
  correct verified archives and live server messages.
- **Never generate any game art.** No handmade SVG paths, generated raster
  images, CSS imitation of metal/stone frames, guessed sideicon index-to-tab
  mapping, emoji decorations, fake orb icons, invented minimap colours,
  substitute fonts, or visual artwork imported from xrsps or elsewhere.
- A DOM element may exist for layout, live data, text diagnostics,
  accessibility, or a transparent interactive hit target. It must not
  fabricate the appearance of an OSRS widget. Use original cache fonts for
  styled RuneScape text; diagnostic text can use the system UI font.
- Only display a sprite when it has actually been resolved from the cache
  reference table and decoded. Do not hide other controls until the exact
  replacement is verified and correctly aligned. No broad overlay may
  cover the 3D viewport. Gate sprite painting to genuinely bounded widgets.
- For missing assets, remove the visual. Leave the control accessible by
  its aria-label/title and provide a plain diagnostic or a user-requested
  debug control where needed. Do not backfill an approximation.
- Never use historical/referenced interface IDs as confirmed revision-240
  identifiers without checking the cache and relevant server attachments.
  Do not invent inventory, stat, item, skill, chat, minimap, or orb values.

## Verification checklist

- Inspect actual JS5 archive metadata, decoded widget IDs and attachments.
- Run remote WebClient CI (`typecheck`, `test:protocol`, `build`).
- Add regression tests for no handmade SVG, fake graphic fallbacks or CSS
  gameframe gradients and for world-scene visibility.
- Explicitly report any remaining unsupported cache formats or CS2
  features. Build success is not proof of live visual fidelity.

The xrsps open-source client may be consulted as a *format/layout reference*;
its assets are not SoloScape's source of truth.
