/** Mechanical delivery processing only: preserve generated colors and real alpha. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public/assets');
const review = path.resolve(root, '../docs/art_review/upgrade_20261002');
const sourceFile = process.argv[2];
if (!sourceFile) throw new Error('Usage: node tools/prepareUpgradeArt.mjs <source-map.json>');
const sources = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const tiles = ['paw', 'grass', 'watering', 'bell', 'fish', 'yarn', 'bone', 'flowerpot'];
await fs.mkdir(review, { recursive: true });
const previousReview = JSON.parse(await fs.readFile(path.join(review, 'assets.json'), 'utf8').catch((error) => {
  if (error.code === 'ENOENT') return '{"assets":[]}';
  throw error;
}));

async function bounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  let totalL = 0, weight = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const alpha = data[i + 3] / 255;
      if (alpha > 0) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
        totalL += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) * alpha;
        weight += alpha;
      }
    }
  }
  if (right < left) throw new Error(`Empty alpha: ${file}`);
  return { left, top, width: right - left + 1, height: bottom - top + 1, meanL: totalL / weight };
}

const records = [];
for (const name of [...tiles, 'home_bg', 'game_bg', 'settings']) {
  const source = sources[name];
  if (!source) throw new Error(`Missing generated source: ${name}`);
  const metadata = await sharp(source).metadata();
  const isTile = tiles.includes(name);
  const isBackground = name.endsWith('_bg');
  const size = isTile ? 256 : 200;
  const group = isTile ? 'tiles' : isBackground ? 'bg' : 'ui';
  const filename = `${name === 'settings' ? 'btn_settings' : name}_v2.webp`;
  const destination = path.join(publicRoot, group, filename);
  if (isBackground) {
    await sharp(source).resize(1125, 2436, { fit: 'cover' }).webp({ quality: 82, effort: 6 }).toFile(destination);
  } else {
    if (!metadata.hasAlpha) throw new Error(`Source lacks real alpha: ${name}`);
    const box = await bounds(source);
    if (box.width === metadata.width && box.height === metadata.height) throw new Error(`Opaque/checkerboard source rejected: ${name}`);
    const maxSubject = isTile ? 174 : 172;
    const resized = await sharp(source).extract({ left: box.left, top: box.top, width: box.width, height: box.height })
      .resize({ width: maxSubject, height: maxSubject, fit: 'inside' }).png().toBuffer();
    // Resampling can erase nearly transparent source-edge pixels. Normalize the
    // actual delivery-resolution silhouette, rather than its source-size halo.
    const deliveryBox = await bounds(resized);
    const subject = await sharp(resized).extract({ left: deliveryBox.left, top: deliveryBox.top,
      width: deliveryBox.width, height: deliveryBox.height })
      .resize({ width: maxSubject, height: maxSubject, fit: 'inside' }).png().toBuffer();
    const subjectSize = await sharp(subject).metadata();
    await sharp({ create: { width: size, height: size, channels: 4, background: '#00000000' } })
      .composite([{ input: subject, left: Math.floor((size - subjectSize.width) / 2), top: Math.floor((size - subjectSize.height) / 2) }])
      .webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(destination);
  }
  const encoded = await fs.readFile(destination);
  const outputMeta = await sharp(encoded).metadata();
  const outputBounds = isBackground ? undefined : await bounds(destination);
  if (isTile && (Math.max(outputBounds.width, outputBounds.height) < 256 * 0.62
    || Math.max(outputBounds.width, outputBounds.height) > 174)) throw new Error(`Subject size outside 62–68%: ${name}`);
  const budget = isBackground ? 200 * 1024 : 30 * 1024;
  if (encoded.length >= budget) throw new Error(`Asset over budget: ${filename}`);
  records.push({ name, path: `assets/${group}/${filename}`, width: outputMeta.width, height: outputMeta.height,
    bytes: encoded.length, alpha: outputMeta.hasAlpha, bounds: outputBounds,
    sourceSha256: createHash('sha256').update(await fs.readFile(source)).digest('hex'),
    sha256: createHash('sha256').update(encoded).digest('hex') });
}
const lookup = Object.fromEntries(records.map((r) => [r.name, r]));
if (lookup.flowerpot.bounds.meanL > 140) throw new Error('Flowerpot must have mean L <= 140');
if (lookup.bell.bounds.meanL - lookup.flowerpot.bounds.meanL < 38) throw new Error('Bell/flowerpot contrast too small');
if (lookup.bone.bounds.meanL - lookup.fish.bounds.meanL < 25) throw new Error('Bone/fish contrast too small');
// Optional panel masters live outside public/. Without them, retain the approved
// v2 deliveries and their provenance, not a dependency on deleted v1 assets.
for (const name of ['panel_win', 'panel_fail']) {
  const source = sources[name];
  const destination = path.join(publicRoot, 'ui', `${name}_v2.webp`);
  if (!source) {
    const encoded = await fs.readFile(destination);
    const previous = previousReview.assets.find((asset) => asset.name === name);
    if (!previous || previous.sha256 !== createHash('sha256').update(encoded).digest('hex')) {
      throw new Error(`Approved ${name}_v2 does not match its review record; provide an external panel master`);
    }
    records.push(previous);
    continue;
  }
  const box = await bounds(source);
  await sharp(source).extract({ left: box.left, top: box.top, width: box.width, height: box.height })
    .webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(destination);
  const encoded = await fs.readFile(destination);
  const metadata = await sharp(encoded).metadata();
  records.push({ name, path: `assets/ui/${name}_v2.webp`, width: metadata.width, height: metadata.height,
    bytes: encoded.length, alpha: metadata.hasAlpha, derivative: 'trim transparent gutter from approved v1 artwork',
    sourceSha256: createHash('sha256').update(await fs.readFile(source)).digest('hex'),
    sha256: createHash('sha256').update(encoded).digest('hex') });
}
await fs.writeFile(path.join(review, 'assets.json'), JSON.stringify({ schemaVersion: 1, date: '2026-10-02', tool: 'built-in image_gen', assets: records }, null, 2) + '\n');

// Review sheets use actual generated pixels; exact 32px images are not enlarged.
for (const gray of [false, true]) {
  const overlays = [];
  for (let i = 0; i < tiles.length; i++) {
    let icon = sharp(path.join(publicRoot, 'tiles', `${tiles[i]}_v2.webp`)).resize(32, 32);
    if (gray) icon = icon.grayscale();
    overlays.push({ input: await icon.png().toBuffer(), left: 8 + i * 40, top: 8 });
  }
  await sharp({ create: { width: 328, height: 48, channels: 4, background: '#fff6e3' } })
    .composite(overlays).png().toFile(path.join(review, gray ? 'tiles_32px_gray.png' : 'tiles_32px.png'));
}
// tiles_before_after.png is an immutable historical review artifact. Do not
// recreate retired public assets just to regenerate that comparison.
console.log(JSON.stringify(records.map(({ name, bytes, bounds }) => ({ name, bytes, meanL: bounds?.meanL })), null, 2));
