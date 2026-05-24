import type { CollisionZone } from "../types";

export const WALKABLE_BOUNDS = { x: 100, y: 420, width: 1790, height: 620 };
export const PLAYER_RADIUS = 32;

export const WALKABLE_POLYGON = [
  { x: 610, y: 420 },
  { x: 1848, y: 420 },
  { x: 1885, y: 1012 },
  { x: 1320, y: 1028 },
  { x: 1280, y: 1080 },
  { x: 125, y: 1035 },
  { x: 105, y: 760 },
  { x: 610, y: 420 }
];

export const STATIC_COLLISIONS: CollisionZone[] = [
  { id: "top-wall", type: "wall", shape: { kind: "rect", x: 0, y: 0, width: 1920, height: 420 } },
  { id: "bottom-edge", type: "wall", shape: { kind: "rect", x: 0, y: 1034, width: 1920, height: 46 } },
  { id: "left-counter", type: "counter", shape: { kind: "rect", x: 36, y: 238, width: 574, height: 468 } },
  { id: "left-wall", type: "wall", shape: { kind: "rect", x: 0, y: 0, width: 58, height: 1080 } },
  { id: "right-wall", type: "wall", shape: { kind: "rect", x: 1886, y: 0, width: 34, height: 1080 } },
  { id: "table-a-zone", type: "table", shape: { kind: "rect", x: 780, y: 450, width: 360, height: 138 } },
  { id: "table-b-zone", type: "table", shape: { kind: "rect", x: 1258, y: 450, width: 360, height: 138 } },
  { id: "table-c-zone", type: "table", shape: { kind: "rect", x: 705, y: 720, width: 360, height: 138 } },
  { id: "table-d-zone", type: "table", shape: { kind: "rect", x: 1225, y: 720, width: 360, height: 138 } },
  { id: "left-barrels", type: "prop", shape: { kind: "circle", x: 338, y: 704, radius: 96 } },
  { id: "right-corner-table", type: "prop", shape: { kind: "rect", x: 1734, y: 414, width: 132, height: 190 } },
  { id: "bottom-right-jars", type: "prop", shape: { kind: "circle", x: 1746, y: 960, radius: 86 } }
];
