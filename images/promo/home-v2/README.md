# Homepage Art V2

Created on 2026-10-02 for the Codex Games hub with the built-in image generation
tool. These are promotional illustrations, not gameplay screenshots. Game art
in the individual projects remains unchanged. This directory holds the current
six game covers and social preview, not a retired set of homepage artwork.

## Files

- Six 1536 x 1024 JPEG masters: `star-fighter.jpg`, `soulmate.jpg`,
  `wulin-tavern.jpg`, `journey-ludo.jpg`, `garden-match.jpg`, `stackpop.jpg`.
- Each game has 480 x 320 and 960 x 640 WebP variants. The page uses `srcset`
  and `sizes`; all game covers are lazy-loaded. The v3 studio banner has high
  fetch priority.
- `studio-share.jpg`: 1200 x 630 social preview with all six games and the
  studio title. Used by Open Graph and Twitter metadata.
- The previous `ai-dev-flow-en.webp` and `ai-dev-flow-cn.webp` were removed
  after the regenerated bilingual illustrations in `../home-v3/` were accepted.

## Retired Assets

The following unused homepage assets were removed from the repository and
production server after checking the current page's references:

- `images/promo/home-v2/ai-dev-flow-en.webp`
- `images/promo/home-v2/ai-dev-flow-cn.webp`
- `images/promo/journey-ludo-cover.jpg`
- `images/promo/garden-match-cover.jpg`
- `images/promo/stackpop-cover.jpg`

Legacy reference filenames below document the source material used during
generation; they are not runtime dependencies. Earlier commits retain their
history. Artwork inside the game projects was not deleted.

## Art Direction And Prompts

All game covers use a 3:2 landscape composition, a center-safe subject,
thumbnail-readable detail, and no text, logos, UI, borders, or watermark.
Reference assets supply identities and the game's existing visual language.

### Star Fighter

Reference: `star_fighter/images/player-level-5.png`.

Preserve the distinctive silver-white angular blue spaceship, central cyan
reactor, glowing cyan exhausts and side wings. Create polished sci-fi game key
art of this ship banking across a crisp deep-space battle, with red enemy ships,
narrow orange projectile trails and asteroids. Dynamic readable arcade action,
large centered ship, rich cyan, silver and crimson on near-black space.
Remove the reference green backdrop. No HUD; not a fabricated gameplay image.

### Soulmate

Reference: `soulmate/images/mate001.jpg`, identity only.

Create one natural intimate editorial photograph of the same adult fictional
East Asian companion, preserving her face, shoulder-length black hair and black
floral/sequined halterneck top. She sits on a muted rose couch by a softly lit
window at dusk, looking at the camera with a gentle smile, one hand near her
cheek and a mug nearby. Warm everyday companionship, natural skin texture,
balanced lighting, no glamour shoot, no duplicated person or expression strip.

### Wulin Tavern

Reference: `Tavern/images/promo/wulin-tavern-homepage.jpg`.

Newly compose premium hand-painted chibi wuxia key art in the recognizable
Chinese timber tavern. Four expressive martial-arts heroes gather around one
foreground table, sharing tea and lively conversation, with sheathed swords,
baozi and wine jars. Bartender behind them, vermilion lanterns, turquoise
moonlight through lattice windows, intricate clothing and timber, readable
faces, warm highlights contrasted with teal night. Promotional illustration.

### Journey Ludo

Reference: `images/promo/journey-ludo-cover.jpg`.

Preserve exactly four distinct chibi pilgrims: Sun Wukong with staff and golden
headband, Zhu Bajie with rake, Tang Seng in red robes and crown, and bearded
Sha Seng with prayer beads. Gather them around a colorful spiral board and one
large rolling ivory die, with jade mountains, waterfalls and a distant golden
temple. Cheerful adventure, painterly storybook finish, sky blue, jade green,
red and gold. No old title, repeated characters or invented rules.

### Garden Match

Reference: `images/promo/garden-match-cover.jpg`.

Preserve Wangcai's caramel floppy ears, creamy muzzle, brown brows and warm
eyes. Place the puppy in a sunny backyard flower garden beside a small
greenhouse, terracotta pots and a watering can. A cluster of floral, leaf, berry
and waterdrop tokens, with three pink flowers popping together, suggests gentle
match-3 without a fabricated game board. Tactile storybook illustration,
emerald green, coral pink, sky blue and yellow. No blank panels or extra pets.

### StackPop

Reference: `images/promo/stackpop-cover.jpg`.

Create tactile stacked white square tiles with embossed pink paws, golden
bells, blue watering cans and green grass. A slightly isometric layered pile
floats above a sky-blue surface. The foreground tray has exactly seven slots:
three identical pink paw tiles followed by four empty compartments. The triple
pops into crisp celebratory particles. Ceramic/plastic materials, soft shadows,
readable symbols, no new mascot, text, buttons or fabricated screenshot.

The first generated draft had eight tray slots. The final edit prompt was:

> Change only the foreground tray. Make exactly seven equal compartments:
> three occupied by identical pink paw tiles and four empty. Keep the tile
> pyramid, symbols, lighting, background and colors unchanged. Frame the entire
> tray inside the landscape canvas with breathing room. No eighth slot.

### Studio Share Cover

References: the new Star Fighter, Soulmate, Wulin Tavern, Garden Match and
StackPop artwork. Journey Ludo's four pilgrims were described in the prompt.

Create a 1.91:1 editorial collage of six recognizable game worlds: cyan ship,
adult companion, lantern-lit wuxia gathering, four pilgrims and dice, puppy and
floral tokens, and pet-symbol tiles. Use restrained asymmetric rectangular
crops, diverse colors and a black title band. Exact title: "Codex Games".
Exact secondary text: "AI Native Game Studio". Legible at thumbnail size.
No extra games, words, watermark, browser frame or purple gradient.

## Rebuild

`scripts/build-home-images.cjs` uses Sharp to derive both WebP sizes from the
JPEG masters. With Sharp available in Node's module path:

```bash
node scripts/build-home-images.cjs
```

The original PNG generations remain in Codex's generated image library. JPEG
masters and final web assets are stored here so the page has no image generation
service dependency.

## Icon

The page embeds Lucide's `arrow-up-right` paths directly in an SVG symbol so
icons also work when opening `index.html` from the filesystem. Upstream:
`lucide-static@0.468.0`; ISC license in `images/ui/LUCIDE-LICENSE`.
