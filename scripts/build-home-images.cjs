#!/usr/bin/env node
const path = require("node:path");
const fs = require("node:fs/promises");
const sharp = require("sharp");

// Rebuild web-sized variants from the versioned JPEG masters, not game assets.
const assetDir = path.resolve(__dirname, "../images/promo/home-v2");
const games = ["star-fighter", "soulmate", "wulin-tavern", "journey-ludo", "garden-match", "stackpop"];
const studioDir = path.resolve(__dirname, "../images/promo/home-v3");
const brandDir = path.resolve(__dirname, "../images/brand");

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
  const studioAssets = [
    { name: "studio-hero", widths: [600, 1200, 1600] },
    { name: "creation-flow-en", widths: [800, 1600] },
    { name: "creation-flow-cn", widths: [800, 1600] }
  ];
  for (const { name, widths } of studioAssets) {
    for (const width of widths) {
      const destination = path.join(studioDir, `${name}-${width}.webp`);
      await sharp(path.join(studioDir, `${name}.jpg`))
        .resize({ width })
        .webp({ quality: 85, effort: 6 })
        .toFile(destination);
      console.log(path.relative(process.cwd(), destination));
    }
  }
  const logoName = "codex-games-v2";
  const logo = path.join(brandDir, `${logoName}.png`);
  await sharp(logo).resize(96, 96).webp({ lossless: true }).toFile(path.join(brandDir, `${logoName}-96.webp`));
  for (const width of [32, 180]) {
    await sharp(logo).resize(width, width).png().toFile(path.join(brandDir, `${logoName}-${width}.png`));
  }
}

build().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
