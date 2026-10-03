#!/usr/bin/env node
const path = require("node:path");
const fs = require("node:fs/promises");
const sharp = require("sharp");

// Rebuild web-sized variants from the versioned JPEG masters, not game assets.
const assetDir = path.resolve(__dirname, "../images/promo/home-v2");
const games = ["star-fighter", "soulmate", "wulin-tavern", "journey-ludo", "garden-match", "stackpop"];

async function build() {
  await fs.mkdir(assetDir, { recursive: true });
  for (const game of games) {
    for (const width of [480, 960]) {
      const destination = path.join(assetDir, `${game}-${width}.webp`);
      await sharp(path.join(assetDir, `${game}.jpg`))
        .resize(width, Math.round(width * 2 / 3), { fit: "cover" })
        .webp({ quality: 82, effort: 6 })
        .toFile(destination);
      console.log(path.relative(process.cwd(), destination));
    }
  }
}

build().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
