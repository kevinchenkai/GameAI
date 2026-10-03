# Homepage v3 artwork

## Integration

- Reuses the accepted six-game Codex Games collage as an uncropped opening banner.
- The banner fills the content width at its natural 40:21 ratio, with no
  fixed height or `contain` letterboxing on desktop.
- Six game covers and social metadata remain on their existing v2 URLs.
- English and Chinese creation illustrations share the same six-stage layout.
- Page copy and semantic ordered list follow the same stages: Idea, World, Prototype, Art & Code, Playtest, Launch & Grow.
- Full-size links open the matching local JPEG, including on a file:// preview.
- Versioned v3 URLs avoid the production server's 30-day image cache.
- Superseded hub flow diagrams and legacy covers have been removed locally
  and from the production server. Current v2 game covers and the social image
  remain in use; the v2 manifest records the exact retired files.

## Files

| Master | Size | Responsive WebP widths |
| --- | --- | --- |
| studio-hero.jpg | 1600 x 840 | 600, 1200, 1600 |
| creation-flow-en.jpg | 1600 x 900 | 800, 1600 |
| creation-flow-cn.jpg | 1600 x 900 | 800, 1600 |

Resize and JPEG/WebP conversion preserve the complete composition. No cropping or generative changes were applied to the approved collage. JPEG masters are committed so derived files can be rebuilt with `node scripts/build-home-images.cjs` (requires Sharp).

## Generation

Mode: built-in image_gen. The English illustration was generated from text; the Chinese illustration used the English result as an edit target. No API credentials or fallback CLI were used.

The original collage's generation prompt is documented in [the v2 manifest](../home-v2/README.md).

### English prompt

```text
Use case: infographic-diagram.
Asset type: finished English illustration for the "How we make our games" section of Codex Games, an independent AI Native browser game studio. Generate a refined, readable landscape 16:9 bitmap, ideally 2048x1152, with a solid charcoal #101112 background matching the website. Not a website mockup.
Primary request: Show a human-led, AI-assisted creative game-making loop in SIX ordered stages. Composition: generous 6% safe margins. At the top, crisp off-white title "From imagination to play", and small subheading "Human direction. AI collaboration. Better with every playtest." Below, a neat TWO ROWS OF THREE STAGES on an unframed charcoal canvas, connected in snake reading order 01→02→03, then down to 04 on bottom RIGHT→05 middle→06 bottom LEFT. Make the numbers prominent and stage labels exceptionally legible; each stage has a beautiful small handcrafted 3D/isometric diorama, not framed cards and not abstract business icons. Upper left 01 Idea: a sketchbook with a tiny rocket and lightbulb, pale yellow. Upper center 02 World: a miniature lantern-lit wuxia tavern, warm amber. Upper right 03 Prototype: a simple colorful playable tile board on a small monitor, mint. Lower right 04 Art & Code: a tasteful tiny workstation with paint swatches, a starship model and simple code screen, cyan. Lower middle 05 Playtest: a hand holding a phone showing colorful match tiles with little checklist, coral. Lower left 06 Launch & Grow: a small garden with a blossoming plant beside a browser window and rocket, green. Each diorama sits above its label and number, enough room, absolutely no overlap. Stage labels exactly: "01  Idea", "02  World", "03  Prototype", "04  Art & Code", "05  Playtest", "06  Launch & Grow". Thin subtle connecting paths with clearly visible arrowheads, gold on top row, cyan down right and bottom row. A subtle return arrow follows outside the stages, from 06 lower left back to 01 upper left, labelled exactly "Play. Learn. Refine." at the left. Optional numbers appear ONLY once per stage, no duplicate labels. Bottom small signature "CODEX GAMES / AI NATIVE GAME STUDIO".
Style: premium editorial illustrated infographic, tactile polished miniature dioramas with realistic tiny materials, quiet soft studio lighting, excellent typography, structured scan-friendly spacing, varied amber/mint/coral/cyan accents on neutral dark charcoal. Clear horizontal text, modern humanist sans serif, no italics. This must look beautiful but communicate an actual understandable iterative workflow. No long paragraphs, no model names, no neon grid, no gradients, no glow effects, no floating decorative orbs, no watermark. ALL text spelled exactly as specified. ONLY those texts.
```

### Chinese localization prompt

```text
Use case: text-localization.
Asset type: Chinese version of the attached finished Codex Games game creation workflow infographic, 16:9.
Input image 1 is the EDIT TARGET. Keep the exact six miniature dioramas, charcoal background, composition, perspective, arrows, numbering, palette, and typography hierarchy. Only replace the infographic's visible wording with Chinese, using clean legible modern Chinese sans serif. Preserve the original canvas/aspect ratio and all safe margins.
Replace the main title "From imagination to play" with exactly "让想象，成为游戏".
Replace subtitle with exactly "人定方向，AI 协作，每次试玩都更进一步。"
Keep numbers 01-06 in the same positions. Replace stage labels exactly:
01 "灵感" (top left)
02 "世界" (top middle)
03 "原型" (top right)
04 "美术与代码" (bottom right)
05 "试玩" (bottom middle)
06 "上线与成长" (bottom left)
Replace left return arrow label with "试玩 · 反馈 · 打磨".
Keep the bottom signature exactly "CODEX GAMES / AI NATIVE GAME STUDIO" in English.
For ALL tiny incidental English text on mugs, note sheets, books, screens, signboards, replace it with short simple Chinese words appropriate to the object, or remove lettering leaving believable blank objects if too small to read. Do not add new English text except the studio signature; code syntax on the code screen may remain code. The tavern's "酒" sign stays. Keep the mobile game board, starship, hand, art supplies, flowers and rocket intact. Do not redesign anything or add any new imagery. Text must be correct and exceptionally legible. No watermark.
```
