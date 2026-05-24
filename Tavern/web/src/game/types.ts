export type Direction = "up" | "down" | "left" | "right";
export type TableId = "A" | "B" | "C" | "D";
export type Topic = "greeting" | "tablemate" | "rumor" | "free";

export type NpcConfig = {
  id: string;
  name: string;
  gender: "male" | "female";
  title: string;
  personalityTag: string;
  coreMeme: string;
  catchphrases: string[];
  speechStyle: string;
  visualKey: string;
  spriteKey: string;
  avatarKey: string;
  presetLines: string[];
};

export type TableConfig = {
  id: TableId;
  name: string;
  theme: string;
  tableAssetKey: string;
  position: { x: number; y: number };
  seatPositions: Array<{ x: number; y: number; facing: Direction }>;
  eventAnchor: { x: number; y: number };
};

export type TableEventConfig = {
  id: string;
  name: string;
  npcIds: string[];
  priority: number;
  preferredTableId?: TableId;
  description: string;
  visualEffectKey: string;
  promptContext: string;
};

export type CollisionZone = {
  id: string;
  type: "wall" | "table" | "counter" | "npc" | "prop";
  shape:
    | { kind: "rect"; x: number; y: number; width: number; height: number }
    | { kind: "circle"; x: number; y: number; radius: number }
    | { kind: "polygon"; points: Array<{ x: number; y: number }> };
};

export type SeatedNpc = {
  npc: NpcConfig;
  tableId: TableId;
  seatIndex: number;
  x: number;
  y: number;
  facing: Direction;
};

export type RoundState = {
  seed: string;
  nextRefreshAt: Date;
  seatedNpcs: SeatedNpc[];
  tableEvents: Partial<Record<TableId, TableEventConfig>>;
};
