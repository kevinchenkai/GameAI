# StackPop M5 执行记录

执行基线：`a4375f0`（`stack-m4-v1.0`）

## 完成范围

- 关卡选择：20 关、4 列网格、已通关星级 / 当前可玩 / 未解锁三种状态。
- 解锁与星级：通关解锁下一关；星级按 Undo + Shuffle 次数计算，并保留历史最好成绩。
- 本地存档：固定 Key `stackpop-save-v1`，区分 `saveSchemaVersion` 与关卡 `levelRevision`。
- 中途恢复：每次合法 Pick、Undo、Shuffle、Restart 后保存；保留最近 5 个撤回 Snapshot。
- Settings：音乐、音效、震动开关；游戏内支持重新开始当前关、返回首页。
- M4 集成：沿用 Asset Manifest；音效继续复用 Phaser WebAudio Context；震动服从设置开关。

## 存档兼容策略

- JSON 损坏或 `saveSchemaVersion` 不兼容：安全回退为新存档。
- `currentRun.levelRevision` 与当前关卡不一致：仅丢弃当前局，保留已解锁关卡、星级与设置。
- localStorage 不可用或写入失败：本局仍可继续运行，不让存储异常中断游戏。

## 自动验证

- `npm run lint`：通过。
- `npm test`：13 个测试文件、83 项测试通过。
- `npm run build`：通过；仅保留 Vite 已知的大包体提示。

新增的 M5 单元测试覆盖：默认值、固定存档 Key、5 步撤回栈往返、关卡修订失配、坏存档安全重置、解锁与最好星级、设置持久化、星级计算。

## 浏览器验收

本地 Vite 页面完成以下真实交互检查：

1. 首页进入第 1 关，完成一次合法 Pick。
2. 刷新页面后首页显示“继续第 1 关”。
3. 点击继续后，columns、tray 与 moveCount 恢复。
4. 点击撤回后回到开局状态，证明持久化的 undoStack 可用。
5. 游戏内关闭音效，关闭并重新打开 Settings 后仍显示关闭。
6. 返回首页并进入关卡选择，确认 4 列布局、当前关与锁定态。

浏览器控制台无运行时错误。

## 边界

- 未修改 M4 已验收的美术文件。
- 未进入 M6：未改 Vite 子目录 base、未写部署脚本、未执行发布。
- iPhone Safari 的真机音频复验仍属于发布前设备验收，不以桌面浏览器结果替代。
