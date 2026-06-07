# JOBLESS Steam Store Assets

## Source

Steamworks official graphical asset documentation:

- https://partner.steamgames.com/doc/store/assets

Steam now requires the larger capsule sizes introduced in August 2024. Old capsule sizes are no longer accepted.

## Generate Draft Assets

```bash
npm run steam:store-assets
```

Generated files:

```text
docs/generated-assets/steam-store/
```

These are draft upload assets made from existing JOBLESS key art and title letters. They are enough to build the Steamworks store page early, but should be replaced by final capsule art before wider promotion.

## Required Store Assets

| Asset | Size | Generated file |
| --- | ---: | --- |
| Header Capsule | 920 x 430 | `store_header_capsule_920x430.png` |
| Small Capsule | 462 x 174 | `store_small_capsule_462x174.png` |
| Main Capsule | 1232 x 706 | `store_main_capsule_1232x706.png` |
| Vertical Capsule | 748 x 896 | `store_vertical_capsule_748x896.png` |
| Screenshots | 1920 x 1080 or larger, 16:9 | Capture separately |
| Page Background | 1438 x 810 | `page_background_1438x810.png` |

## Required Community And Client Icons

| Asset | Size / format | Generated file |
| --- | ---: | --- |
| Shortcut Icon | 256 x 256 PNG or ICO | `shortcut_icon_256x256.png` |
| App Icon | 184 x 184 JPG | `app_icon_184x184.jpg` |

## Required Library Assets

| Asset | Size / format | Generated file |
| --- | ---: | --- |
| Library Capsule | 600 x 900 | `library_capsule_600x900.png` |
| Library Hero | 3840 x 1240 PNG | `library_hero_3840x1240.png` |
| Library Logo | 1280 wide and/or 720 tall PNG | `library_logo_1280x720.png` |
| Library Header Capsule | 920 x 430 | `library_header_capsule_920x430.png` |

## Event Assets

| Asset | Size | Generated file |
| --- | ---: | --- |
| Event Cover | 800 x 450 | `event_cover_800x450.png` |
| Event Header | 1920 x 622 | `event_header_1920x622.png` |

## Asset Rules

- Base capsule images should contain only game artwork, the game name, and an official subtitle if needed.
- Do not put update text, discount text, review scores, awards, dates, or marketing copy into base capsules.
- Use capsule artwork overrides for short-term campaign text.
- Keep small capsule readability as the strictest check.

## Screenshot Plan

- Title screen with world tree and JOBLESS logo.
- Battle screen with cards, enemies, and time bar visible.
- Job select screen showing multiple jobs.
- Map progression screen.
- Reward selection screen.
- Ranking screen showing shared ranking.
- Winner card or card collection screen.

## Final Art Direction

- Keep the world tree as the first visual signal.
- Logo should stay readable at the small capsule size.
- Use a darker lower area for logo contrast, but avoid making the image look like a generic dark fantasy asset.
- Final capsules should include card-battle information visually, because the generated drafts mostly communicate world tree and atmosphere.
