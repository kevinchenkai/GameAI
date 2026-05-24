import type { TableConfig } from "../types";

export const TABLES: TableConfig[] = [
  {
    id: "A",
    name: "A 桌",
    theme: "靠前台的点菜八卦桌",
    tableAssetKey: "table-a",
    position: { x: 960, y: 535 },
    seatPositions: [
      { x: 850, y: 470, facing: "right" },
      { x: 1030, y: 635, facing: "left" }
    ],
    eventAnchor: { x: 960, y: 430 }
  },
  {
    id: "B",
    name: "B 桌",
    theme: "靠窗雅座",
    tableAssetKey: "table-b",
    position: { x: 1438, y: 535 },
    seatPositions: [
      { x: 1325, y: 470, facing: "right" },
      { x: 1510, y: 635, facing: "left" }
    ],
    eventAnchor: { x: 1438, y: 430 }
  },
  {
    id: "C",
    name: "C 桌",
    theme: "大厅中部热闹酒局",
    tableAssetKey: "table-c",
    position: { x: 885, y: 808 },
    seatPositions: [
      { x: 760, y: 735, facing: "right" },
      { x: 1010, y: 910, facing: "left" }
    ],
    eventAnchor: { x: 885, y: 715 }
  },
  {
    id: "D",
    name: "D 桌",
    theme: "右下暗角修罗场",
    tableAssetKey: "table-d",
    position: { x: 1405, y: 808 },
    seatPositions: [
      { x: 1265, y: 735, facing: "right" },
      { x: 1515, y: 910, facing: "left" }
    ],
    eventAnchor: { x: 1405, y: 715 }
  }
];

export const TABLE_BY_ID = Object.fromEntries(TABLES.map((table) => [table.id, table])) as Record<string, TableConfig>;
