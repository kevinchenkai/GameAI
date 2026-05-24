import { TABLE_EVENTS } from "../data/events";
import { NPCS } from "../data/npcs";
import { TABLES, TABLE_BY_ID } from "../data/tables";
import type { NpcConfig, RoundState, TableEventConfig, TableId } from "../types";

type Rng = () => number;

export function createRoundState(seed = getCurrentRoundSeed()): RoundState {
  const rng = mulberry32(hashSeed(seed));
  const count = 4 + Math.floor(rng() * 3);
  const selected = shuffle([...NPCS], rng).slice(0, count);
  const assignments = assignTables(selected, rng);
  const seatedNpcs = assignments.flatMap(([tableId, npcs]) => {
    const table = TABLE_BY_ID[tableId];
    return npcs.map((npc, index) => {
      const seat = table.seatPositions[index];
      return {
        npc,
        tableId,
        seatIndex: index,
        x: seat.x,
        y: seat.y,
        facing: seat.facing
      };
    });
  });

  const tableEvents: RoundState["tableEvents"] = {};
  for (const event of TABLE_EVENTS) {
    const tableId = findEventTable(event, assignments);
    if (tableId && !tableEvents[tableId]) tableEvents[tableId] = event;
  }

  return {
    seed,
    nextRefreshAt: getNextRefreshAt(new Date()),
    seatedNpcs,
    tableEvents
  };
}

export function getCurrentRoundSeed(date = new Date()): string {
  const slot = Math.floor(date.getHours() / 4) * 4;
  const day = date.toISOString().slice(0, 10);
  return `${day}-${String(slot).padStart(2, "0")}`;
}

export function createDemoSeed(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function assignTables(selected: NpcConfig[], rng: Rng): Array<[TableId, NpcConfig[]]> {
  const assignments = TABLES.map((table) => [table.id, []] as [TableId, NpcConfig[]]);
  const byId = new Map(selected.map((npc) => [npc.id, npc]));
  const used = new Set<string>();

  for (const event of [...TABLE_EVENTS].sort((a, b) => b.priority - a.priority)) {
    const members = event.npcIds.map((id) => byId.get(id));
    if (members.some((npc) => !npc || used.has(npc.id))) continue;
    const preferred = event.preferredTableId ? assignments.find(([id]) => id === event.preferredTableId) : undefined;
    const target = preferred && preferred[1].length === 0 ? preferred : assignments.find(([, npcs]) => npcs.length === 0);
    if (!target) continue;
    target[1].push(...(members as NpcConfig[]).slice(0, 2));
    members.forEach((npc) => npc && used.add(npc.id));
  }

  const remaining = selected.filter((npc) => !used.has(npc.id));
  for (const table of assignments) {
    if (table[1].length === 0 && remaining.length > 0) table[1].push(remaining.shift() as NpcConfig);
  }
  for (const npc of remaining) {
    const options = shuffle(assignments.filter(([, npcs]) => npcs.length < 2), rng);
    options[0]?.[1].push(npc);
  }
  return assignments;
}

function findEventTable(event: TableEventConfig, assignments: Array<[TableId, NpcConfig[]]>): TableId | undefined {
  return assignments.find(([, npcs]) => event.npcIds.every((id) => npcs.some((npc) => npc.id === id)))?.[0];
}

function getNextRefreshAt(date: Date): Date {
  const next = new Date(date);
  const nextHour = (Math.floor(date.getHours() / 4) + 1) * 4;
  if (nextHour >= 24) {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else {
    next.setHours(nextHour, 0, 0, 0);
  }
  return next;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): Rng {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
