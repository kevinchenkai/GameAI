// Codex Games homepage hero: a floating island holding six miniature game worlds.
// Progressive enhancement only. The static poster stays in the DOM, and this module
// never owns navigation; it renders, reports picks, and cleans up after itself.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { HorizontalTiltShiftShader } from "three/addons/shaders/HorizontalTiltShiftShader.js";
import { VerticalTiltShiftShader } from "three/addons/shaders/VerticalTiltShiftShader.js";

const TAU = Math.PI * 2;
const PLINTH_R = 4.1;
const WORLD_SCALE = 1.18;
const WORLDS = [
  { id: "star", accent: 0x87ddf0, ground: 0x2e384c },
  { id: "soul", accent: 0xefb2c7, ground: 0xc79a8f },
  { id: "tavern", accent: 0xf0c77f, ground: 0x9a7452 },
  { id: "journey", accent: 0x9ec3fc, ground: 0x5f9478 },
  { id: "garden", accent: 0xa4de9a, ground: 0x7cb46a },
  { id: "stack", accent: 0xf0c59e, ground: 0xe3cba8 }
];
// Camera framing per layout. "wide" shows the whole island; "close" puts the
// selected world in front for phone-shaped stages.
const VIEWS = {
  wide: { pos: [0, 7.4, 15.2], target: [0, 0.1, 1.2], fov: 30 },
  close: { pos: [0, 4.8, 13.4], target: [0, 0.75, 3.7], fov: 32 }
};
const QUALITY = {
  high: { dpr: 1.5, shadows: true, shadowSize: 2048, post: true, detail: 1, frameMs: 0, slowMs: 26 },
  low: { dpr: 1.5, shadows: false, shadowSize: 1024, post: false, detail: 0.55, frameMs: 31, slowMs: 45 }
};

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export async function createStage({ host, tier = "high", assets, onPick, onHover }) {
  const quality = { ...QUALITY[tier] };
  const random = seeded(20261021);
  const disposables = new Set();
  const track = item => (disposables.add(item), item);

  // ---------------------------------------------------------------- renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "default" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 120);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.32;
  scene.fog = new THREE.Fog(0x1b2f3b, 21, 44);

  const loader = new THREE.TextureLoader();
  const [sky, tileAtlas] = await Promise.all([loader.loadAsync(assets.sky), loader.loadAsync(assets.tiles)]);
  for (const texture of [sky, tileAtlas]) {
    texture.colorSpace = THREE.SRGBColorSpace;
    track(texture);
  }
  tileAtlas.anisotropy = 4;
  scene.background = sky;

  // ---------------------------------------------------------------- lighting
  // Warm low sun from the horizon side, cool sky fill, cyan rim: one light family for all six worlds.
  scene.add(new THREE.HemisphereLight(0xb4d6e0, 0x4a3a2e, 0.72));
  const sun = new THREE.DirectionalLight(0xffd6a6, 2.9);
  sun.position.set(-9, 7.5, 6);
  sun.castShadow = quality.shadows;
  sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x80e7dd, 1.4);
  rim.position.set(3, 5, -10);
  scene.add(rim);

  // ---------------------------------------------------------------- helpers
  const materials = new Map();
  function mat(color, options = {}) {
    const key = JSON.stringify([color, options]);
    if (!materials.has(key)) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: options.rough ?? 0.75,
        metalness: options.metal ?? 0,
        flatShading: options.flat ?? false,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.glow ?? 1,
        side: options.side ?? THREE.FrontSide
      });
      materials.set(key, track(material));
    }
    return materials.get(key);
  }
  const uniqueMat = (color, options) => track(mat(color, options).clone());

  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(track(geometry), material);
    object.position.set(x, y, z);
    object.castShadow = quality.shadows;
    object.receiveShadow = quality.shadows;
    return object;
  }

  const glowTexture = (() => {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return track(texture);
  })();

  function glow(color, size, opacity = 1) {
    const material = track(new THREE.SpriteMaterial({
      map: glowTexture, color, opacity, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    sprite.userData.baseOpacity = opacity;
    return sprite;
  }

  function lathe(points, scale = 1, segments = 20) {
    return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x * scale, y * scale)), segments);
  }

  function iconMaterial(index, tint = 0xffffff) {
    const texture = track(tileAtlas.clone());
    texture.repeat.set(0.46, 0.46);
    texture.offset.set((index % 2) * 0.5 + 0.02, (index < 2 ? 0.5 : 0) + 0.02);
    texture.needsUpdate = true;
    return track(new THREE.MeshStandardMaterial({ map: texture, color: tint, roughness: 0.42 }));
  }

  // ---------------------------------------------------------------- island
  const island = new THREE.Group();
  scene.add(island);
  const turntable = new THREE.Group();
  island.add(turntable);

  // Diorama cross-section: grass skin, soil band, rock band, rocky underside.
  const grassMap = (() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    g.fillStyle = "#719a5a";
    g.fillRect(0, 0, size, size);
    const tones = ["#628d4f", "#86b06b", "#93bb78", "#557f45", "#73a05c"];
    for (let i = 0; i < 2600; i++) {
      const x = random() * size, y = random() * size, r = 1 + random() * 3.2;
      g.globalAlpha = 0.25 + random() * 0.35;
      g.fillStyle = tones[i % tones.length];
      // Draw wrapped copies so the texture tiles without seams.
      for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
        g.beginPath();
        g.ellipse(x + dx, y + dy, r, r * 0.7, random() * Math.PI, 0, TAU);
        g.fill();
      }
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    texture.anisotropy = 4;
    return track(texture);
  })();
  const grassTop = track(new THREE.MeshStandardMaterial({ map: grassMap, roughness: 1 }));
  const grassSide = mat(0x6a8c55, { rough: 1 });
  turntable.add(mesh(new THREE.CylinderGeometry(6.4, 6.38, 0.2, 96), [grassSide, grassTop, grassSide], 0, -0.1, 0));
  turntable.add(mesh(new THREE.CylinderGeometry(6.36, 6.22, 0.42, 72), mat(0x8a5f3e, { rough: 1 }), 0, -0.41, 0));
  turntable.add(mesh(new THREE.CylinderGeometry(6.22, 5.7, 0.6, 22), mat(0x8c7563, { flat: true, rough: 1 }), 0, -0.92, 0));
  const plaza = mesh(lathe([[0, 0], [1.56, 0], [1.6, 0.03], [1.58, 0.07], [1.52, 0.08], [0, 0.08]], 1, 64), mat(0xe4d7bd, { rough: 0.85 }));
  turntable.add(plaza);

  const underside = new THREE.ConeGeometry(5.7, 5.4, 18, 6);
  underside.rotateX(Math.PI);
  const pos = underside.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y > 2.6) continue;
    // Position-based noise keeps duplicated seam vertices welded.
    const n = Math.sin(x * 2.3 + z * 1.7) * 0.5 + Math.sin(z * 3.1 - y * 1.3) * 0.35;
    const k = 1 + n * 0.12;
    pos.setXYZ(i, x * k, y + n * 0.25, z * k);
  }
  underside.computeVertexNormals();
  turntable.add(mesh(underside, mat(0x6b5a4c, { flat: true, rough: 1 }), 0, -3.92, 0));

  const floaters = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.4;
    const r = 7.2 + random() * 1.4;
    const rock = mesh(new THREE.DodecahedronGeometry(0.22 + random() * 0.3, 0), mat(0x7a6656, { flat: true, rough: 1 }),
      Math.sin(a) * r, -1.2 - random() * 2.2, Math.cos(a) * r);
    rock.rotation.set(random() * 3, random() * 3, 0);
    rock.userData.phase = random() * TAU;
    rock.userData.baseY = rock.position.y;
    island.add(rock);
    floaters.push(rock);
  }

  // Studio core at the centre: the shared spark behind every world.
  const core = new THREE.Group();
  core.add(mesh(new THREE.CylinderGeometry(0.42, 0.6, 0.4, 8), mat(0xd8cab0, { flat: true, rough: 0.9 }), 0, 0.28, 0));
  const crystalGeo = new THREE.OctahedronGeometry(0.42, 0);
  crystalGeo.scale(0.8, 1.2, 0.8);
  const crystal = mesh(crystalGeo, mat(0xbff7f1, { emissive: 0x80e7dd, glow: 1.3, rough: 0.2, flat: true }), 0, 1.35, 0);
  crystal.castShadow = false;
  const ringA = mesh(new THREE.TorusGeometry(0.6, 0.018, 8, 64), mat(0x80e7dd, { emissive: 0x80e7dd, glow: 1.4 }), 0, 1.35, 0);
  const ringB = ringA.clone();
  ringA.castShadow = ringB.castShadow = false;
  const coreGlow = glow(0x80e7dd, 1.9, 0.45);
  coreGlow.position.y = 1.35;
  core.add(crystal, ringA, ringB, coreGlow);
  turntable.add(core);

  // ---------------------------------------------------------------- worlds
  const builders = { star: buildStar, soul: buildSoul, tavern: buildTavern, journey: buildJourney, garden: buildGarden, stack: buildStack };
  const pickables = [];
  const worlds = WORLDS.map((def, index) => {
    const angle = (index / WORLDS.length) * TAU;
    const sin = Math.sin(angle), cos = Math.cos(angle);

    const base = new THREE.Group();
    base.position.set(sin * PLINTH_R, 0, cos * PLINTH_R);
    // One bevelled stone disc with the world's ground inset into it.
    base.add(mesh(lathe([[0, 0], [1.84, 0], [1.9, 0.05], [1.9, 0.2], [1.85, 0.27], [1.78, 0.29], [0, 0.29]], 1, 72), mat(0xd3c2a2, { rough: 0.9 })));
    base.add(mesh(new THREE.CylinderGeometry(1.72, 1.72, 0.04, 64), mat(def.ground, { rough: 0.85 }), 0, 0.3, 0));
    const ringMat = uniqueMat(def.accent, { emissive: def.accent, glow: 0.05 });
    const ring = mesh(new THREE.TorusGeometry(1.81, 0.022, 8, 128), ringMat, 0, 0.3, 0);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = false;
    base.add(ring);
    turntable.add(base);

    // Stepping stones from the plaza.
    for (let s = 0; s < 3; s++) {
      const r = 1.78 + s * 0.3;
      const stone = mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.05, 10), mat(0xe4d7bd, { rough: 0.9 }), sin * r, 0.02, cos * r);
      turntable.add(stone);
    }

    const built = builders[def.id](def);
    built.group.position.set(sin * PLINTH_R, 0.32, cos * PLINTH_R);
    built.group.rotation.y = angle;
    turntable.add(built.group);

    for (const object of [base, built.group]) {
      object.userData.world = index;
      pickables.push(object);
    }
    return { ...def, angle, ringMat, group: built.group, update: built.update, focus: 0, hover: 0 };
  });

  // ---------------------------------------------------------------- scatter
  // Grass tufts, pebbles and wild flowers fill the gaps between worlds. Instancing
  // keeps each family to one draw call; placement avoids plinths, plaza and paths.
  const plinthCentres = worlds.map(w => new THREE.Vector2(Math.sin(w.angle) * PLINTH_R, Math.cos(w.angle) * PLINTH_R));
  function freeSpot(margin) {
    for (let tries = 0; tries < 40; tries++) {
      const a = random() * TAU, r = Math.sqrt(random()) * 6.15;
      const p = new THREE.Vector2(Math.sin(a) * r, Math.cos(a) * r);
      if (r < 1.75 + margin) continue;
      if (plinthCentres.some(c => c.distanceTo(p) < 1.98 + margin)) continue;
      // Leave the stepping-stone paths clear.
      if (r < 2.5 && worlds.some(w => Math.abs(((a - w.angle + Math.PI) % TAU + TAU) % TAU - Math.PI) < 0.12)) continue;
      return p;
    }
    return null;
  }
  function scatter(geometry, material, count, palette, scaleRange, lift, tilt) {
    const instanced = new THREE.InstancedMesh(track(geometry), material, count);
    instanced.receiveShadow = quality.shadows;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
    const color = new THREE.Color();
    let n = 0;
    for (let i = 0; i < count; i++) {
      const p = freeSpot(0.05);
      if (!p) continue;
      const k = scaleRange[0] + random() * (scaleRange[1] - scaleRange[0]);
      e.set((random() - 0.5) * tilt, random() * TAU, (random() - 0.5) * tilt);
      m.compose(v.set(p.x, lift * k, p.y), q.setFromEuler(e), s.set(k, k, k));
      instanced.setMatrixAt(n, m);
      instanced.setColorAt(n, color.set(palette[Math.floor(random() * palette.length)]));
      n++;
    }
    instanced.count = n;
    turntable.add(instanced);
    return instanced;
  }
  const detail = quality.detail;
  const tuftGeo = new THREE.ConeGeometry(0.05, 0.2, 4);
  scatter(tuftGeo, mat(0xffffff, { rough: 1, flat: true }), Math.round(320 * detail), [0x5f8a4e, 0x6f9a5c, 0x7fae62, 0x8cbf6e], [0.6, 1.3], 0.09, 0.5);
  scatter(new THREE.DodecahedronGeometry(0.06, 0), mat(0xffffff, { rough: 0.95, flat: true }), Math.round(45 * detail), [0x9d907c, 0xb3a68f, 0x8a7e6c], [0.6, 1.6], 0.02, 1);
  scatter(new THREE.SphereGeometry(0.03, 8, 6), mat(0xffffff, { rough: 0.6, emissive: 0x222222 }), Math.round(80 * detail), [0xffffff, 0xf6a5c0, 0xffd76b, 0xc7a7f2], [0.8, 1.3], 0.07, 0);

  // ---------------------------------------------------------------- atmosphere
  const cloudTexture = (() => {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    for (const [x, y, r] of [[0.5, 0.56, 0.3], [0.32, 0.6, 0.2], [0.68, 0.6, 0.22], [0.42, 0.45, 0.2], [0.6, 0.46, 0.18]]) {
      const gradient = g.createRadialGradient(x * size, y * size, 0, x * size, y * size, r * size);
      gradient.addColorStop(0, "rgba(255,255,255,0.9)");
      gradient.addColorStop(0.6, "rgba(255,255,255,0.35)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gradient;
      g.fillRect(0, 0, size, size);
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return track(texture);
  })();
  const cloudSea = new THREE.Group();
  scene.add(cloudSea);
  const cloudCount = Math.round(30 * detail);
  for (let i = 0; i < cloudCount; i++) {
    const a = (i / cloudCount) * TAU + random() * 0.3;
    const r = 5 + random() * 9;
    // Clouds on the sunset side pick up the warm horizon.
    const warm = Math.max(0, -Math.sin(a));
    const tint = new THREE.Color(0xdbe6ee).lerp(new THREE.Color(0xffc9a8), warm * 0.8);
    const cloud = new THREE.Sprite(track(new THREE.SpriteMaterial({
      map: cloudTexture, color: tint, transparent: true, depthWrite: false, opacity: 0.28 + random() * 0.3
    })));
    const s = 3.5 + random() * 4;
    cloud.scale.set(s * 1.6, s, 1);
    cloud.position.set(Math.sin(a) * r, -4.4 - random() * 2.4, Math.cos(a) * r);
    cloudSea.add(cloud);
  }

  // A small stream that runs off the rim into the clouds.
  const fallAngle = (3.5 / WORLDS.length) * TAU;
  const fallTexture = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(170,225,240,0.55)";
    g.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,255,255,${0.35 + random() * 0.55})`;
      g.fillRect(random() * 64, random() * 128, 1 + random() * 2.5, 10 + random() * 30);
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return track(texture);
  })();
  const waterfall = new THREE.Group();
  waterfall.rotation.y = fallAngle;
  const fallMaterial = track(new THREE.MeshBasicMaterial({ map: fallTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  const fall = new THREE.Mesh(track(new THREE.PlaneGeometry(0.42, 3.6)), fallMaterial);
  fall.position.set(0, -1.75, 6.44);
  // A crossed second sheet keeps the fall readable when the rim turns side-on.
  const fallCross = fall.clone();
  fallCross.rotation.y = Math.PI / 2;
  fallCross.scale.x = 0.6;
  waterfall.add(fall, fallCross);
  const streamTexture = track(fallTexture.clone());
  streamTexture.needsUpdate = true;
  streamTexture.repeat.set(1, 0.4);
  const stream = new THREE.Mesh(track(new THREE.PlaneGeometry(0.26, 0.7).rotateX(-Math.PI / 2)),
    track(new THREE.MeshBasicMaterial({ map: streamTexture, transparent: true, depthWrite: false })));
  stream.position.set(0, 0.012, 6.0);
  waterfall.add(stream);
  const mist = glow(0xffffff, 1.6, 0.4);
  mist.position.set(0, -3.6, 6.5);
  waterfall.add(mist);
  turntable.add(waterfall);

  function buildStar() {
    const group = new THREE.Group();
    group.add(mesh(new THREE.CylinderGeometry(0.95, 1, 0.05, 6), mat(0x3d4860, { metal: 0.4, rough: 0.5 }), 0, 0.025, 0.15));
    const padRing = mesh(new THREE.TorusGeometry(0.82, 0.018, 6, 48), mat(0x87ddf0, { emissive: 0x87ddf0, glow: 1.6 }), 0, 0.06, 0.15);
    padRing.rotation.x = Math.PI / 2;
    group.add(padRing);

    const gate = new THREE.Group();
    gate.position.set(-0.15, 1.15, -0.75);
    gate.rotation.y = 0.35;
    gate.add(mesh(new THREE.TorusGeometry(0.88, 0.075, 12, 56), mat(0xc4cfdc, { metal: 0.7, rough: 0.32 })));
    const gateInner = mesh(new THREE.TorusGeometry(0.88, 0.028, 8, 56), mat(0x87ddf0, { emissive: 0x87ddf0, glow: 2 }), 0, 0, 0.05);
    gateInner.castShadow = false;
    gate.add(gateInner);
    for (const side of [-1, 1]) {
      gate.add(mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), mat(0x59657c, { metal: 0.5, rough: 0.5 }), side * 0.62, -0.78, 0));
    }
    group.add(gate);

    const fighter = new THREE.Group();
    const hull = mat(0xe8edf3, { metal: 0.35, rough: 0.32 });
    const bodyGeo = new THREE.ConeGeometry(0.17, 1.05, 6);
    bodyGeo.rotateX(Math.PI / 2);
    fighter.add(mesh(bodyGeo, hull));
    const cockpitGeo = new THREE.SphereGeometry(0.1, 16, 12);
    cockpitGeo.scale(0.8, 0.65, 1.7);
    fighter.add(mesh(cockpitGeo, mat(0x5fd0ff, { emissive: 0x2aa8d8, glow: 0.8, rough: 0.12, metal: 0.2 }), 0, 0.1, 0.12));
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0.05, 0.28);
    wingShape.lineTo(0.72, -0.3);
    wingShape.lineTo(0.72, -0.42);
    wingShape.lineTo(0.05, -0.36);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.035, bevelEnabled: false });
    wingGeo.rotateX(Math.PI / 2);
    const wingMat = mat(0x3f6fd6, { metal: 0.45, rough: 0.38, side: THREE.DoubleSide });
    const tipMat = mat(0x87ddf0, { emissive: 0x87ddf0, glow: 1.8 });
    for (const side of [-1, 1]) {
      const wing = mesh(wingGeo, wingMat, 0, 0.02, 0);
      wing.scale.x = side;
      fighter.add(wing);
      fighter.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.16), tipMat, side * 0.72, 0.02, -0.34));
      const engineGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.3, 10);
      engineGeo.rotateX(Math.PI / 2);
      fighter.add(mesh(engineGeo, mat(0x8a96a8, { metal: 0.6, rough: 0.35 }), side * 0.16, 0, -0.42));
    }
    const exhausts = [-1, 1].map(side => {
      const flame = glow(0x7fe9ff, 0.55, 0.95);
      flame.position.set(side * 0.16, 0, -0.62);
      fighter.add(flame);
      return flame;
    });
    fighter.position.set(0.25, 1.05, 0.35);
    fighter.rotation.y = -0.85;
    group.add(fighter);

    const rocks = [];
    for (let i = 0; i < 5; i++) {
      const rock = mesh(new THREE.IcosahedronGeometry(0.09 + random() * 0.13, 0), mat(0x6d6660, { flat: true, rough: 1 }));
      rock.userData = { r: 1.05 + random() * 0.45, a: random() * TAU, y: 0.35 + random() * 1.4, speed: 0.15 + random() * 0.2 };
      rocks.push(rock);
      group.add(rock);
    }

    return {
      group,
      update(t, dt, focus) {
        fighter.position.y = 1.05 + Math.sin(t * 1.6) * 0.07 + focus * 0.12;
        fighter.position.z = 0.35 + focus * 0.18;
        fighter.rotation.z = Math.sin(t * 1.1) * 0.12;
        fighter.rotation.x = Math.sin(t * 0.8) * 0.05;
        exhausts.forEach((flame, i) => {
          const s = 0.5 + Math.sin(t * 22 + i * 2) * 0.06 + focus * 0.15;
          flame.scale.set(s, s, 1);
        });
        for (const rock of rocks) {
          const d = rock.userData;
          d.a += dt * d.speed;
          rock.position.set(Math.cos(d.a) * d.r, d.y + Math.sin(t + d.a) * 0.05, Math.sin(d.a) * d.r * 0.8);
          rock.rotation.x += dt * 0.4;
          rock.rotation.y += dt * 0.3;
        }
      }
    };
  }

  function buildSoul() {
    const group = new THREE.Group();
    const rug = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.02, 40), mat(0xefb2c7, { rough: 1 }), 0.15, 0.01, 0.25);
    group.add(rug);

    // A wall with a dusk window: the room glows from the outside in.
    group.add(mesh(new THREE.BoxGeometry(1.9, 1.55, 0.12), mat(0xf1e4d6, { rough: 0.9 }), 0, 0.78, -0.82));
    const duskCanvas = document.createElement("canvas");
    duskCanvas.width = 32;
    duskCanvas.height = 64;
    const dusk = duskCanvas.getContext("2d");
    const sky = dusk.createLinearGradient(0, 0, 0, 64);
    sky.addColorStop(0, "#5d6fa8");
    sky.addColorStop(0.55, "#f2a28a");
    sky.addColorStop(1, "#ffd59a");
    dusk.fillStyle = sky;
    dusk.fillRect(0, 0, 32, 64);
    const duskTexture = track(new THREE.CanvasTexture(duskCanvas));
    duskTexture.colorSpace = THREE.SRGBColorSpace;
    const pane = mesh(new THREE.PlaneGeometry(0.8, 0.8), track(new THREE.MeshBasicMaterial({ map: duskTexture })), 0.25, 0.92, -0.755);
    pane.castShadow = false;
    group.add(pane);
    const frame = mat(0x8b5e48, { rough: 0.7 });
    for (const [w, h, x, y] of [[0.9, 0.06, 0.25, 1.32], [0.9, 0.06, 0.25, 0.52], [0.06, 0.86, -0.17, 0.92], [0.06, 0.86, 0.67, 0.92], [0.035, 0.8, 0.25, 0.92], [0.8, 0.035, 0.25, 0.92]]) {
      group.add(mesh(new THREE.BoxGeometry(w, h, 0.06), frame, x, y, -0.73));
    }
    const windowGlow = glow(0xffb47a, 1.6, 0.35);
    windowGlow.position.set(0.25, 0.92, -0.6);
    group.add(windowGlow);

    const sofa = mat(0xd98fa7, { rough: 0.85 });
    group.add(mesh(new RoundedBoxGeometry(1.05, 0.28, 0.5, 3, 0.08), sofa, -0.32, 0.2, -0.3));
    group.add(mesh(new RoundedBoxGeometry(1.05, 0.42, 0.16, 3, 0.07), sofa, -0.32, 0.45, -0.52));
    for (const side of [-1, 1]) group.add(mesh(new RoundedBoxGeometry(0.16, 0.36, 0.5, 3, 0.06), sofa, -0.32 + side * 0.5, 0.28, -0.3));

    // Ginger cat, loafing on the sofa.
    const cat = new THREE.Group();
    const fur = mat(0xf0a65e, { rough: 0.9 });
    const bodyGeo = new THREE.SphereGeometry(0.16, 20, 14);
    bodyGeo.scale(1.35, 0.78, 0.95);
    cat.add(mesh(bodyGeo, fur));
    const head = mesh(new THREE.SphereGeometry(0.11, 20, 14), fur, 0.2, 0.08, 0.04);
    cat.add(head);
    for (const side of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.04, 0.08, 4), fur, 0.21, 0.19, 0.04 + side * 0.06);
      ear.rotation.x = side * 0.3;
      cat.add(ear);
      cat.add(mesh(new THREE.SphereGeometry(0.014, 8, 6), mat(0x2b2220), 0.3, 0.1, 0.04 + side * 0.04));
    }
    const tail = mesh(new THREE.TorusGeometry(0.13, 0.028, 8, 16, Math.PI * 1.1), fur, -0.2, 0, 0.02);
    tail.rotation.x = Math.PI / 2;
    cat.add(tail);
    cat.position.set(-0.45, 0.43, -0.25);
    cat.rotation.y = -0.5;
    group.add(cat);

    group.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.035, 24), mat(0xb98466, { rough: 0.6 }), 0.55, 0.42, 0.25));
    group.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 8), mat(0x8b5e48), 0.55, 0.2, 0.25));
    const steam = [];
    [[0.47, 0xfbf6ef], [0.64, 0xf6b9cb]].forEach(([x, color], i) => {
      group.add(mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.12, 16), mat(color, { rough: 0.35 }), x, 0.5, 0.22 + i * 0.06));
      const handle = mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12), mat(color, { rough: 0.35 }), x + 0.07, 0.5, 0.22 + i * 0.06);
      group.add(handle);
      const puff = glow(0xffffff, 0.18, 0.25);
      puff.userData.x = x;
      puff.userData.z = 0.22 + i * 0.06;
      puff.userData.phase = i * 0.5;
      group.add(puff);
      steam.push(puff);
    });

    const heartShape = new THREE.Shape();
    heartShape.moveTo(5, 5);
    heartShape.bezierCurveTo(5, 5, 4, 0, 0, 0);
    heartShape.bezierCurveTo(-6, 0, -6, 7, -6, 7);
    heartShape.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
    heartShape.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
    heartShape.bezierCurveTo(16, 7, 16, 0, 10, 0);
    heartShape.bezierCurveTo(7, 0, 5, 5, 5, 5);
    const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 4, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5, bevelSegments: 3, curveSegments: 16 });
    heartGeo.center();
    heartGeo.rotateZ(Math.PI);
    heartGeo.scale(0.016, 0.016, 0.016);
    const heart = mesh(heartGeo, mat(0xf48fb1, { emissive: 0xe0607e, glow: 0.45, rough: 0.35 }), 0.62, 1.35, 0.2);
    group.add(heart);

    return {
      group,
      update(t, dt, focus) {
        tail.rotation.z = Math.sin(t * 2.2) * 0.35;
        head.rotation.z = Math.sin(t * 0.7) * 0.08;
        heart.position.y = 1.32 + Math.sin(t * 1.4) * 0.07 + focus * 0.1;
        heart.rotation.y = Math.sin(t * 0.9) * 0.6;
        const beat = 1 + Math.max(0, Math.sin(t * 4.4)) ** 6 * (0.08 + focus * 0.1);
        heart.scale.setScalar(beat);
        windowGlow.material.opacity = windowGlow.userData.baseOpacity * (1 + focus * 0.6);
        for (const puff of steam) {
          const p = (t * 0.45 + puff.userData.phase) % 1;
          puff.position.set(puff.userData.x + Math.sin(t * 2 + p * 6) * 0.02, 0.6 + p * 0.45, puff.userData.z);
          puff.material.opacity = 0.28 * Math.sin(p * Math.PI);
        }
      }
    };
  }

  function buildTavern() {
    const group = new THREE.Group();
    group.add(mesh(new THREE.BoxGeometry(2.0, 0.12, 1.55), mat(0xa89c8a, { rough: 0.95 }), 0, 0.06, -0.15));
    const red = mat(0xa8382f, { rough: 0.6 });
    for (const x of [-0.74, 0.74]) for (const z of [-0.72, 0.42]) {
      group.add(mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.95, 10), red, x, 0.595, z));
    }
    group.add(mesh(new THREE.BoxGeometry(1.48, 0.86, 0.06), mat(0xeadcc2, { rough: 0.9 }), 0, 0.55, -0.72));
    const moon = mesh(new THREE.CircleGeometry(0.22, 32), mat(0xffd08a, { emissive: 0xffa94d, glow: 1.2 }), 0, 0.62, -0.685);
    moon.castShadow = false;
    group.add(moon);
    group.add(mesh(new THREE.BoxGeometry(1.86, 0.08, 1.48), mat(0x6e2b25, { rough: 0.6 }), 0, 1.1, -0.15));
    // A four-sided lathe with a concave profile gives the curved, flared eaves.
    const roofGeo = lathe([[1.46, 0], [1.22, 0.08], [0.95, 0.19], [0.62, 0.35], [0.3, 0.53], [0.08, 0.64], [0, 0.66]], 1, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale(1.12, 1, 0.92);
    const tiles = mat(0x3c4250, { rough: 0.55, metal: 0.1, flat: true, side: THREE.DoubleSide });
    group.add(mesh(roofGeo, tiles, 0, 1.14, -0.15));
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      const eave = mesh(new THREE.ConeGeometry(0.04, 0.24, 5), tiles, x * 1.12, 1.2, -0.15 + z * 0.92);
      eave.rotation.set(z * 0.7, 0, -x * 0.7);
      group.add(eave);
    }
    group.add(mesh(new THREE.SphereGeometry(0.07, 12, 10), mat(0xe7b84a, { metal: 0.8, rough: 0.3 }), 0, 1.82, -0.15));

    const lanterns = [-0.55, 0.55].map(x => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.06, 0.5);
      pivot.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 4), mat(0x2b2220), 0, -0.09, 0));
      const lanternGeo = new THREE.SphereGeometry(0.11, 18, 14);
      lanternGeo.scale(1, 1.25, 1);
      const lantern = mesh(lanternGeo, mat(0xe0492f, { emissive: 0xff5a1f, glow: 1.1, rough: 0.6 }), 0, -0.3, 0);
      lantern.castShadow = false;
      pivot.add(lantern);
      const gold = mat(0xe7b84a, { metal: 0.8, rough: 0.3 });
      pivot.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), gold, 0, -0.16, 0));
      pivot.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), gold, 0, -0.44, 0));
      const halo = glow(0xff8a3d, 0.9, 0.7);
      halo.position.y = -0.3;
      pivot.add(halo);
      group.add(pivot);
      return { pivot, halo, phase: x * 3 };
    });

    const wood = mat(0x7a4f32, { rough: 0.7 });
    group.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 24), wood, 0, 0.5, -0.1));
    group.add(mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.38, 8), wood, 0, 0.31, -0.1));
    for (const [x, z] of [[-0.48, 0.05], [0.46, -0.05]]) group.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 12), wood, x, 0.25, z));
    const jarPoints = [[0, 0], [0.09, 0], [0.13, 0.05], [0.15, 0.13], [0.12, 0.22], [0.07, 0.26], [0.075, 0.3], [0, 0.3]];
    group.add(mesh(lathe(jarPoints, 0.55), mat(0x6b3f27, { rough: 0.45 }), -0.06, 0.525, -0.12));
    for (const [x, z, s] of [[0.98, 0.62, 1.15], [1.18, 0.38, 0.95], [0.78, 0.82, 0.85]]) {
      group.add(mesh(lathe(jarPoints, s * 1.3), mat(0x7a4a2c, { rough: 0.45 }), x - 0.15, 0, z - 0.25));
      group.add(mesh(new THREE.CylinderGeometry(0.1 * s, 0.1 * s, 0.03, 12), mat(0xc0392b), x - 0.15, 0.39 * s, z - 0.25));
    }

    const pole = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), mat(0x5a3a26), -1.0, 0.75, 0.55);
    group.add(pole);
    const flagGeo = new THREE.PlaneGeometry(0.32, 0.5, 6, 1);
    flagGeo.translate(0.16, 0, 0);
    const flag = mesh(flagGeo, mat(0xd2442f, { side: THREE.DoubleSide, rough: 0.8 }), -0.98, 1.22, 0.55);
    group.add(flag);
    const flagBase = flagGeo.attributes.position.array.slice();

    return {
      group,
      update(t, dt, focus) {
        for (const lantern of lanterns) {
          lantern.pivot.rotation.z = Math.sin(t * 1.3 + lantern.phase) * 0.12;
          lantern.halo.material.opacity = 0.62 + Math.sin(t * 7 + lantern.phase) * 0.06 + focus * 0.25;
        }
        const p = flagGeo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = flagBase[i * 3];
          p.setZ(i, Math.sin(t * 3 + x * 9) * 0.06 * (x / 0.32));
        }
        p.needsUpdate = true;
      }
    };
  }

  function buildJourney() {
    const group = new THREE.Group();
    const peak = mat(0x4f8a72, { flat: true, rough: 0.9 });
    const tip = mat(0x9fd0b0, { flat: true, rough: 0.9 });
    for (const [x, z, r, h] of [[-0.65, -0.6, 0.6, 1.65], [0.7, -0.68, 0.48, 1.2], [-0.02, -0.98, 0.42, 0.95], [1.12, -0.1, 0.3, 0.7]]) {
      group.add(mesh(new THREE.ConeGeometry(r, h, 7), peak, x, h / 2, z));
      group.add(mesh(new THREE.ConeGeometry(r * 0.38, h * 0.38, 7), tip, x, h * 0.81 + 0.005, z));
    }
    const red = mat(0xb8443a, { rough: 0.55 });
    for (const x of [-0.46, 0.46]) group.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 10), red, x, 0.5, 0.2));
    group.add(mesh(new THREE.BoxGeometry(1.2, 0.1, 0.12), red, 0, 0.86, 0.2));
    group.add(mesh(new THREE.BoxGeometry(1.42, 0.06, 0.32), mat(0x2f5d50, { rough: 0.5 }), 0, 0.97, 0.2));
    group.add(mesh(new THREE.BoxGeometry(0.9, 0.08, 0.2), mat(0x2f5d50, { rough: 0.5 }), 0, 1.04, 0.2));
    group.add(mesh(new THREE.BoxGeometry(0.32, 0.17, 0.03), mat(0xe2b03c, { metal: 0.7, rough: 0.3 }), 0, 0.7, 0.27));
    for (let i = 0; i < 4; i++) {
      group.add(mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.04, 10), mat(0xd9ccb1, { rough: 0.9 }), (i % 2 ? 0.08 : -0.08), 0.02, 0.48 + i * 0.28));
    }

    const cloudMat = mat(0xf6f2ea, { rough: 1, emissive: 0x2a2f3a, glow: 0.6 });
    const clouds = [[-0.9, 0.95, 0.2], [0.55, 1.45, -0.2], [-0.3, 1.55, -0.5]].map(([x, y, z], i) => {
      const cloud = new THREE.Group();
      for (const [cx, cy, r] of [[0, 0, 0.17], [0.17, -0.03, 0.13], [-0.17, -0.03, 0.12], [0.07, 0.08, 0.12]]) {
        const puff = mesh(new THREE.SphereGeometry(r, 14, 10), cloudMat, cx, cy, 0);
        puff.castShadow = false;
        cloud.add(puff);
      }
      cloud.position.set(x, y, z);
      cloud.userData = { x, phase: i * 2.1 };
      group.add(cloud);
      return cloud;
    });

    const staff = new THREE.Group();
    staff.add(mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.45, 12), mat(0xe2b03c, { metal: 0.9, rough: 0.25 })));
    for (const y of [-0.72, 0.72]) staff.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 12), mat(0xc0392b, { metal: 0.3, rough: 0.4 }), 0, y, 0));
    const staffGlow = glow(0xffd36b, 1.5, 0.28);
    staff.add(staffGlow);
    staff.position.set(0.62, 1.35, 0.45);
    staff.rotation.z = 0.85;
    group.add(staff);

    return {
      group,
      update(t, dt, focus) {
        for (const cloud of clouds) cloud.position.x = cloud.userData.x + Math.sin(t * 0.35 + cloud.userData.phase) * 0.18;
        staff.rotation.y += dt * (0.6 + focus * 1.4);
        staff.position.y = 1.35 + Math.sin(t * 1.2) * 0.08 + focus * 0.1;
        staffGlow.material.opacity = 0.22 + focus * 0.25;
      }
    };
  }

  function buildGarden() {
    const group = new THREE.Group();
    const white = mat(0xf3efe4, { rough: 0.8 });
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + (i / 10 - 0.5) * 2.1;
      group.add(mesh(new THREE.BoxGeometry(0.07, 0.36, 0.045), white, Math.sin(a) * 1.45, 0.18, Math.cos(a) * 1.45));
    }
    for (const y of [0.12, 0.27]) {
      // Arc spans the same back half as the pickets.
      const railGeo = new THREE.TorusGeometry(1.45, 0.018, 6, 48, 2.1).rotateX(Math.PI / 2).rotateY(Math.PI / 2 + 1.05);
      group.add(mesh(railGeo, white, 0, y, 0));
    }
    const arch = mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 28, Math.PI), mat(0x4f9a4a, { rough: 0.8 }), 0, 0.42, -1.2);
    group.add(arch);
    for (const side of [-1, 1]) group.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 8), mat(0x4f9a4a, { rough: 0.8 }), side * 0.42, 0.21, -1.2));
    const blossoms = [0xf6a5c0, 0xffd76b, 0xffffff, 0xc7a7f2];
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI;
      group.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(blossoms[i % 4], { rough: 0.6 }), Math.cos(a) * 0.42, 0.42 + Math.sin(a) * 0.42, -1.17));
    }

    const shrub = mat(0x3f7f45, { rough: 0.9, flat: true });
    for (const [x, z, r] of [[-1.05, -0.45, 0.26], [1.0, -0.55, 0.3], [-0.85, -0.8, 0.2]]) {
      group.add(mesh(new THREE.IcosahedronGeometry(r, 1), shrub, x, r * 0.8, z));
    }

    const potPoints = [[0, 0], [0.11, 0], [0.15, 0.2], [0.175, 0.205], [0.175, 0.24], [0.16, 0.24], [0, 0.22]];
    const sprouts = [];
    for (const [x, z, s] of [[-0.55, 0.3, 1], [0.05, 0.6, 0.85], [0.42, -0.1, 1.1]]) {
      group.add(mesh(lathe(potPoints, s), mat(0xc96e45, { rough: 0.7 }), x, 0, z));
      const sprout = new THREE.Group();
      sprout.position.set(x, 0.22 * s, z);
      sprout.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.3, 6), mat(0x4f9a4a), 0, 0.15, 0));
      for (const side of [-1, 1]) {
        const leafGeo = new THREE.SphereGeometry(0.07, 10, 8);
        leafGeo.scale(1.4, 0.35, 0.7);
        const leaf = mesh(leafGeo, mat(0x6cc24a, { rough: 0.6 }), side * 0.08, 0.24, 0);
        leaf.rotation.z = side * 0.4;
        sprout.add(leaf);
      }
      sprout.add(mesh(new THREE.SphereGeometry(0.06, 12, 10), mat(0xf6a5c0, { emissive: 0x6a2a3a, glow: 0.4 }), 0, 0.33, 0));
      sprout.userData.phase = x * 4;
      sprout.userData.scale = s;
      group.add(sprout);
      sprouts.push(sprout);
    }
    for (let i = 0; i < 9; i++) {
      const x = -1.1 + random() * 2.2, z = 0.6 + random() * 0.6;
      if (Math.hypot(x, z) > 1.5) continue;
      group.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4), mat(0x4f9a4a), x, 0.08, z));
      group.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(blossoms[i % 4], { rough: 0.6 }), x, 0.17, z));
    }

    // Wangcai, sitting by the pots.
    const dog = new THREE.Group();
    const coat = mat(0xe8b878, { rough: 0.85 });
    const ears = mat(0xb9844f, { rough: 0.85 });
    const bodyGeo = new THREE.SphereGeometry(0.15, 18, 14);
    bodyGeo.scale(0.95, 1.15, 1.05);
    dog.add(mesh(bodyGeo, coat, 0, 0.17, 0));
    const head = new THREE.Group();
    head.position.set(0, 0.42, 0.05);
    head.add(mesh(new THREE.SphereGeometry(0.13, 18, 14), coat));
    head.add(mesh(new THREE.SphereGeometry(0.06, 12, 10), mat(0xf6dcb4), 0, -0.03, 0.11));
    head.add(mesh(new THREE.SphereGeometry(0.022, 8, 6), mat(0x2b2220), 0, 0, 0.17));
    for (const side of [-1, 1]) {
      const earGeo = new THREE.SphereGeometry(0.06, 10, 8);
      earGeo.scale(0.55, 1.2, 0.8);
      const ear = mesh(earGeo, ears, side * 0.12, -0.01, 0);
      ear.rotation.z = side * 0.35;
      head.add(ear);
      head.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(0x2b2220), side * 0.05, 0.035, 0.115));
    }
    dog.add(head);
    const dogTail = mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.16, 6), coat, 0, 0.12, -0.17);
    dogTail.rotation.x = -0.8;
    dog.add(dogTail);
    dog.position.set(0.72, 0, 0.55);
    dog.rotation.y = -0.4;
    group.add(dog);

    const fireflies = [0, 1, 2].map(i => {
      const fly = glow(0xe8ff9a, 0.16, 0.9);
      fly.userData.phase = i * 2.3;
      group.add(fly);
      return fly;
    });

    return {
      group,
      update(t, dt, focus) {
        for (const sprout of sprouts) {
          const grow = sprout.userData.scale * (0.9 + Math.sin(t * 0.8 + sprout.userData.phase) * 0.08 + focus * 0.12);
          sprout.scale.setScalar(grow);
        }
        dogTail.rotation.z = Math.sin(t * (6 + focus * 6)) * 0.5;
        head.rotation.z = Math.sin(t * 0.9) * 0.1;
        for (const fly of fireflies) {
          const p = t * 0.5 + fly.userData.phase;
          fly.position.set(Math.sin(p) * 0.9, 0.55 + Math.sin(p * 2.3) * 0.25, Math.cos(p * 0.8) * 0.6);
          fly.material.opacity = 0.5 + Math.sin(t * 5 + fly.userData.phase) * 0.4;
        }
      }
    };
  }

  function buildStack() {
    const group = new THREE.Group();
    const tileGeo = track(new RoundedBoxGeometry(0.42, 0.13, 0.42, 3, 0.05));
    const baseGeo = track(new RoundedBoxGeometry(0.4, 0.06, 0.4, 2, 0.025));
    const iconGeo = track(new THREE.PlaneGeometry(0.35, 0.35).rotateX(-Math.PI / 2));
    const bright = mat(0xf6efe2, { rough: 0.45 });
    const covered = mat(0xc9bfae, { rough: 0.55 });
    const underside = mat(0xe0b98c, { rough: 0.5 });

    function tile(icon, isCovered) {
      const t = new THREE.Group();
      t.add(mesh(baseGeo, underside, 0, -0.075, 0));
      const body = mesh(tileGeo, isCovered ? covered : bright);
      t.add(body);
      const faceMat = iconMaterial(icon, isCovered ? 0x9d978d : 0xffffff);
      const face = new THREE.Mesh(iconGeo, faceMat);
      face.position.y = 0.0655;
      face.receiveShadow = quality.shadows;
      t.add(face);
      t.userData = { body, faceMat };
      return t;
    }

    const layout = [];
    [-0.46, 0, 0.46].forEach((x, i) => [-0.42, 0.04].forEach((z, j) => layout.push({ x, z, y: 0.1, icon: (i + j * 2) % 4, layer: 0 })));
    [-0.23, 0.23].forEach((x, i) => layout.push({ x, z: -0.19, y: 0.29, icon: i ? 2 : 1, layer: 1 }));
    layout.push({ x: 0, z: -0.19, y: 0.48, icon: 0, layer: 2 });
    const tiles = layout.map(spec => {
      const t = tile(spec.icon, spec.layer < 2);
      t.position.set(spec.x, spec.y, spec.z);
      t.rotation.y = (random() - 0.5) * 0.12;
      t.userData.spec = spec;
      group.add(t);
      return t;
    });
    const topTile = tiles[tiles.length - 1];
    const middle = tiles.filter(t => t.userData.spec.layer === 1);

    group.add(mesh(new RoundedBoxGeometry(1.78, 0.1, 0.36, 2, 0.04), mat(0x6b5878, { rough: 0.5 }), 0, 0.05, 0.85));
    for (let i = 0; i < 7; i++) {
      group.add(mesh(new THREE.BoxGeometry(0.2, 0.02, 0.26), mat(0x463a52, { rough: 0.7 }), -0.75 + i * 0.25, 0.1, 0.85));
    }
    for (const i of [0, 1]) {
      const mini = tile(0, false);
      mini.scale.setScalar(0.5);
      mini.position.set(-0.75 + i * 0.25, 0.15, 0.85);
      group.add(mini);
    }

    const sparkles = Array.from({ length: 8 }, (_, i) => {
      const sparkle = glow([0xffd76b, 0xf6a5c0, 0x87ddf0, 0xffffff][i % 4], 0.14, 0);
      sparkle.userData.dir = new THREE.Vector3(Math.cos((i / 8) * TAU), 0.6 + (i % 3) * 0.25, Math.sin((i / 8) * TAU)).normalize();
      group.add(sparkle);
      return sparkle;
    });
    const burstOrigin = new THREE.Vector3(0, 1.0, -0.19);
    const faceBright = new THREE.Color(0xffffff), faceCovered = new THREE.Color(0x9d978d);

    return {
      group,
      update(t, dt, focus) {
        const period = 4.2;
        const p = (t % period) / period;
        const lift = ease((p - 0.5) / 0.22);
        const vanish = ease((p - 0.72) / 0.06);
        const back = ease((p - 0.9) / 0.1);
        const away = p >= 0.78 && p < 0.9;
        topTile.position.y = 0.48 + lift * (0.5 + focus * 0.15) * (1 - back) + (p >= 0.9 ? (1 - back) * 0.6 : 0);
        topTile.rotation.y = lift * Math.PI * 0.5;
        const scale = p >= 0.9 ? back : (1 + lift * 0.18) * (1 - vanish);
        topTile.scale.setScalar(Math.max(scale, 0.001));
        topTile.visible = !away;

        // Middle tiles read as uncovered while the top tile is away, as in the game.
        const exposed = ease((p - 0.74) / 0.06) * (1 - ease((p - 0.9) / 0.06));
        for (const m of middle) {
          m.userData.body.material = exposed > 0.5 ? bright : covered;
          m.userData.faceMat.color.copy(faceCovered).lerp(faceBright, exposed);
        }

        const burst = (p - 0.74) / 0.18;
        for (const sparkle of sparkles) {
          if (burst > 0 && burst < 1) {
            sparkle.position.copy(sparkle.userData.dir).multiplyScalar(0.15 + burst * 0.7).add(burstOrigin);
            sparkle.material.opacity = Math.sin(burst * Math.PI) * 0.95;
          } else {
            sparkle.material.opacity = 0;
          }
        }
      }
    };
  }

  // ---------------------------------------------------------------- dust
  const dustCount = tier === "low" ? 90 : 170;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const a = random() * TAU, r = 3 + random() * 9;
    dustPositions.set([Math.sin(a) * r, -1.5 + random() * 6.5, Math.cos(a) * r], i * 3);
  }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeo, track(new THREE.PointsMaterial({
    color: 0xffe6c4, size: 0.06, transparent: true, opacity: 0.75,
    depthWrite: false, blending: THREE.AdditiveBlending, map: glowTexture
  })));
  scene.add(dust);

  // ---------------------------------------------------------------- state
  let selected = 0;
  let hovered = -1;
  let spin = 0;
  let view = VIEWS.wide;
  const pointer = new THREE.Vector2(0, 0);
  const parallax = new THREE.Vector2(0, 0);
  const lookAt = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let time = 0;

  function coverBackground(aspect) {
    const imageAspect = sky.image.width / sky.image.height;
    if (aspect < imageAspect) {
      sky.repeat.set(aspect / imageAspect, 1);
      sky.offset.set((1 - sky.repeat.x) / 2, 0);
    } else {
      sky.repeat.set(1, imageAspect / aspect);
      sky.offset.set(0, (1 - sky.repeat.y) * 0.35);
    }
  }

  let composer = null;
  let tiltH = null, tiltV = null;
  if (quality.post) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.45, 1.0));
    tiltH = new ShaderPass(HorizontalTiltShiftShader);
    tiltV = new ShaderPass(VerticalTiltShiftShader);
    composer.addPass(tiltH);
    composer.addPass(tiltV);
    composer.addPass(new OutputPass());
  }
  function disposeComposer() {
    if (!composer) return;
    for (const pass of composer.passes) pass.dispose?.();
    composer.dispose();
    composer = null;
  }
  const draw = () => (composer ? composer.render() : renderer.render(scene, camera));

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    view = camera.aspect < 1.45 ? VIEWS.close : VIEWS.wide;
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
    coverBackground(camera.aspect);
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      // Sharp band through the front world, softening toward top and bottom edges.
      tiltH.uniforms.h.value = 0.9 / width;
      tiltV.uniforms.v.value = 0.9 / height;
      tiltH.uniforms.r.value = tiltV.uniforms.r.value = 0.45;
    }
  }

  function update(dt) {
    time += dt;
    const target = -worlds[selected].angle;
    const delta = ((target - spin + Math.PI) % TAU + TAU) % TAU - Math.PI;
    spin = smooth(spin, spin + delta, 2.6, dt);
    turntable.rotation.y = spin + Math.sin(time * 0.25) * 0.04;
    island.position.y = Math.sin(time * 0.6) * 0.06;

    worlds.forEach((world, index) => {
      world.focus = smooth(world.focus, index === selected ? 1 : 0, 3.5, dt);
      world.hover = smooth(world.hover, index === hovered ? 1 : 0, 6, dt);
      world.ringMat.emissiveIntensity = 0.05 + world.focus * 2.4 + world.hover * 0.9;
      world.group.scale.setScalar(WORLD_SCALE * (0.9 + world.focus * 0.14));
      // Every world turns its front to the camera, so the back row stays readable.
      world.group.rotation.y = -turntable.rotation.y;
      world.update(time, dt, world.focus);
    });

    crystal.rotation.y += dt * 0.6;
    crystal.position.y = 1.35 + Math.sin(time * 1.3) * 0.08;
    ringA.rotation.set(Math.PI / 2 + Math.sin(time * 0.5) * 0.4, time * 0.4, 0);
    ringB.rotation.set(Math.PI / 2.6, -time * 0.5, Math.cos(time * 0.4) * 0.3);
    for (const rock of floaters) {
      rock.position.y = rock.userData.baseY + Math.sin(time * 0.7 + rock.userData.phase) * 0.18;
      rock.rotation.y += dt * 0.15;
    }
    dust.rotation.y += dt * 0.02;
    cloudSea.rotation.y += dt * 0.012;
    fallTexture.offset.y += dt * 0.9;
    streamTexture.offset.y += dt * 0.5;
    mist.material.opacity = 0.32 + Math.sin(time * 1.7) * 0.08;

    parallax.x = smooth(parallax.x, pointer.x, 2.5, dt);
    parallax.y = smooth(parallax.y, pointer.y, 2.5, dt);
    camera.position.set(view.pos[0] + parallax.x * 0.7, view.pos[1] - parallax.y * 0.35, view.pos[2]);
    lookAt.set(...view.target);
    camera.lookAt(lookAt);
  }

  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, true).find(h => h.object.visible);
    let object = hit?.object;
    while (object && object.userData.world === undefined) object = object.parent;
    return object ? object.userData.world : -1;
  }

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function onPointerMove(event) {
    if (!finePointer) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);
    const next = pick(event.clientX, event.clientY);
    if (next !== hovered) {
      hovered = next;
      canvas.style.cursor = hovered >= 0 ? "pointer" : "";
      onHover?.(hovered);
    }
  }
  function onPointerLeave() {
    pointer.set(0, 0);
    hovered = -1;
    canvas.style.cursor = "";
    onHover?.(-1);
  }
  function onClick(event) {
    const index = pick(event.clientX, event.clientY);
    if (index >= 0) onPick?.(index);
  }
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("click", onClick);

  // ---------------------------------------------------------------- lifecycle
  let raf = 0;
  let last = 0;
  let inView = true;
  let destroyed = false;
  let failHandler = null;
  const monitor = { frames: 0, sum: 0, warmup: 0, strikes: 0 };

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const elapsed = now - last;
    if (quality.frameMs && elapsed < quality.frameMs) return;
    last = now;
    const dt = Math.min(elapsed / 1000, 1 / 20);
    update(dt);
    draw();
    watchQuality(elapsed);
  }

  // Degrade only after sustained slow windows, and never count the warm-up.
  function watchQuality(elapsed) {
    if (monitor.warmup < 45) { monitor.warmup++; return; }
    monitor.frames++;
    monitor.sum += elapsed;
    if (monitor.frames < 90) return;
    const mean = monitor.sum / monitor.frames;
    monitor.frames = monitor.sum = 0;
    if (mean < quality.slowMs) { monitor.strikes = 0; return; }
    if (++monitor.strikes < 2) return;
    monitor.strikes = 0;
    monitor.warmup = 0;
    const ratio = renderer.getPixelRatio();
    if (composer) {
      disposeComposer();
    } else if (ratio > 1) {
      renderer.setPixelRatio(Math.max(1, ratio - 0.25));
      resize();
    } else if (renderer.shadowMap.enabled) {
      renderer.shadowMap.enabled = false;
      sun.castShadow = false;
    } else if (!quality.frameMs) {
      quality.frameMs = 31;
      quality.slowMs = 45;
    } else {
      failHandler?.("slow");
    }
  }

  function play() {
    if (raf || destroyed || !inView || document.hidden) return;
    last = performance.now();
    monitor.warmup = 0;
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  const resizeObserver = new ResizeObserver(() => { resize(); if (!raf) draw(); });
  const intersection = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    inView ? play() : pause();
  }, { rootMargin: "80px" });
  const onVisibility = () => (document.hidden ? pause() : play());
  const onContextLost = event => {
    event.preventDefault();
    pause();
    failHandler?.("context-lost");
  };
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);

  host.appendChild(canvas);
  resize();
  update(0);
  await renderer.compileAsync(scene, camera);
  draw();
  resizeObserver.observe(host);
  intersection.observe(host);

  return {
    canvas,
    get selected() { return selected; },
    select(index) { selected = ((index % WORLDS.length) + WORLDS.length) % WORLDS.length; },
    set onFail(handler) { failHandler = handler; },
    start: play,
    destroy() {
      destroyed = true;
      pause();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.traverse(object => { if (object.geometry) object.geometry.dispose(); });
      for (const item of disposables) item.dispose?.();
      disposeComposer();
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    }
  };
}
