# StackPop / 萌宠叠叠消

移动端优先的竖屏 H5 Triple-Match 游戏。

当前完成阶段：M0 + M1 + M2 + M3。已具备规则原型、Undo、seeded Shuffle、Worker
Solver、三 Bot Simulator、JSON LevelLoader，以及符合 V0.3.4 难度规则的 20 关数据
（L1~L5 手工配置，L6~L20 种子生成）。正式美术、完整 UI 与存档将在后续里程碑实现。

```bash
cd web
npm install
npm run dev
npm run lint
npm test
npm run build
npm run generate-levels
npm run validate-levels
npm run validate-levels:stable
npm run validate-levels:stable -- --trial-seeds=20260823,555
npm run simulate
```

布局验证参数：

```text
?level=1
?level=20
?layout=depth12&overlap=0.80
?layout=depth12&overlap=0.83
?layout=depth12&overlap=0.85
```
