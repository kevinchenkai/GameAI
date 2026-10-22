# Homepage 3D Stage Assets

Created on 2026-10-21 for the homepage three.js hero in `index.html`
(`home-3d/stage.js`). Generated with Codex `gpt-6.1-sol` built-in image
generation via model-bridge, then resized to WebP locally with `cwebp`.
Static images use `expires 30d` on the server: change the `-vN` suffix when
replacing art.

## Files

- `sky-backdrop-v1-1600.webp` / `sky-backdrop-v1-1024.webp`: 2:1 painted
  twilight sky used as `scene.background` (cover-fitted). 1024 for the low tier.
  Source: 1774 x 887 PNG.
- `stack-tiles-v1-512.webp`: 2x2 atlas of StackPop tile faces (paw, bell,
  watering can, grass). The stage samples each cell with a 2% inset to avoid
  bleed. Source: 1254 x 1254 PNG.

## Prompts (summary)

- Sky: calm painterly twilight, deep teal-navy top with sparse stars and a faint
  galaxy band, warm amber horizon, soft distant blue-grey mountains, subtle
  cyan (#80e7dd) aurora at upper right, quiet centre for the island. No text,
  characters, buildings or UI.
- Tiles: exact 2x2 grid, no gutters, flat cream (#f6efe2) cells, one glossy
  casual-game icon per cell readable at 64 px, consistent upper-left lighting.
  No text or frames.

The island, six worlds and all lighting are procedural geometry in
`home-3d/stage.js`; there are no model files.
