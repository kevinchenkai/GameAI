# CLAUDE.md — StackPop 子项目约束

实现唯一依据：`docs/H5_StackPop_游戏策划和执行方案_V0.3.md` 与
`docs/StackPop_美术素材工单_V1.md`。V0.1 / V0.2 已作废。

## 冻结契约

- `web/src/game/core/` 与 `config/` 零 Phaser 依赖。
- `core/rules/` 是 GameModel、Solver、Simulator 的规则单一真源。
- 列数组 bottom → top；只取末位顶牌。
- Tray 固定 7 格，允许不同类型共存，按 type 分组，任意三同立即消除。
- 随机统一走 SeededRandom；不直接调用 `Math.random()`。
- strict TypeScript，不写 `any`；可调数值放在 `config/`。
- 本阶段完全不做商业化，也不预留广告接口。
- 未经明确要求不 push、不部署、不修改站点根首页。

## 阶段纪律

按 M0 → M1 → M2 → M3 → M4 → M5 → M6 执行。每阶段跑完 lint / test / build，
汇报后等待确认，不越级实现。美术按工单第 0~3 批逐批确认。

## 部署红线

未来部署只允许写 `/www/wwwroot/g.ismayday.mobi/stack/`，绝不对站点根执行
`rsync --delete`。部署脚本默认 `DRY_RUN=1`。
