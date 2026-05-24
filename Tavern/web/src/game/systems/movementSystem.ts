import Phaser from "phaser";
import { PLAYER_RADIUS, STATIC_COLLISIONS, WALKABLE_BOUNDS, WALKABLE_POLYGON } from "../data/collisions";
import type { CollisionZone, Direction } from "../types";

export type MoveIntent = {
  x: number;
  y: number;
  moving: boolean;
  direction: Direction;
};

export function readKeyboardIntent(cursors: Phaser.Types.Input.Keyboard.CursorKeys, wasd: Record<string, Phaser.Input.Keyboard.Key>): MoveIntent {
  const x = Number(cursors.right?.isDown || wasd.D.isDown) - Number(cursors.left?.isDown || wasd.A.isDown);
  const y = Number(cursors.down?.isDown || wasd.S.isDown) - Number(cursors.up?.isDown || wasd.W.isDown);
  const len = Math.hypot(x, y) || 1;
  const nx = x / len;
  const ny = y / len;
  return {
    x: nx,
    y: ny,
    moving: x !== 0 || y !== 0,
    direction: Math.abs(x) > Math.abs(y) ? (x > 0 ? "right" : "left") : y > 0 ? "down" : "up"
  };
}

export function resolveMove(
  x: number,
  y: number,
  dx: number,
  dy: number,
  dynamicZones: CollisionZone[]
): { x: number; y: number } {
  const zones = [...STATIC_COLLISIONS, ...dynamicZones];
  const nextX = x + dx;
  const nextY = y + dy;
  let resolvedX = canStandAt(nextX, y, zones) ? nextX : x;
  let resolvedY = canStandAt(resolvedX, nextY, zones) ? nextY : y;
  if (!canStandAt(resolvedX, resolvedY, zones)) {
    resolvedX = x;
    resolvedY = y;
  }
  return { x: resolvedX, y: resolvedY };
}

export function canStandAt(x: number, y: number, zones: CollisionZone[] = STATIC_COLLISIONS): boolean {
  if (
    x < WALKABLE_BOUNDS.x ||
    x > WALKABLE_BOUNDS.x + WALKABLE_BOUNDS.width ||
    y < WALKABLE_BOUNDS.y ||
    y > WALKABLE_BOUNDS.y + WALKABLE_BOUNDS.height
  ) {
    return false;
  }
  if (!pointInPolygon(x, y, WALKABLE_POLYGON)) return false;
  return zones.every((zone) => !circleIntersectsZone(x, y, PLAYER_RADIUS, zone));
}

function circleIntersectsZone(x: number, y: number, radius: number, zone: CollisionZone): boolean {
  const shape = zone.shape;
  if (shape.kind === "circle") {
    return Math.hypot(x - shape.x, y - shape.y) < radius + shape.radius;
  }
  if (shape.kind === "rect") {
    const nearestX = Phaser.Math.Clamp(x, shape.x, shape.x + shape.width);
    const nearestY = Phaser.Math.Clamp(y, shape.y, shape.y + shape.height);
    return Math.hypot(x - nearestX, y - nearestY) < radius;
  }
  return false;
}

function pointInPolygon(x: number, y: number, polygon: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    const intersects = pi.y > y !== pj.y > y && x < ((pj.x - pi.x) * (y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
