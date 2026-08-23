# StackPop M2 执行记录

日期：2026-08-23

## 阶段范围

本轮按 V0.3 的 M2 范围完成：`UndoManager`、`SeededRandom`、Solver、带当前 Tray
可解性校验的 Shuffle、`SolverWorker`、三 Bot Simulator、逐步 solution 校验与 CLI。
20 关正式数据属于 M3，本轮只提供 §64 的 M2 固定夹具。

## P0-1：完整列去重

`core/Solver.ts` 的去重签名为：

```ts
const signature = column.join(',');
```

配套测试覆盖：

- `[bell,paw]` 与 `[fish,paw]` 顶部都为 paw，返回两个动作。
- 两个完整相同列只返回一个动作。
- Seeded 生成 200 个随机可达局面；完整列剪枝结果与完全不做对称剪枝的 DFS 真值逐例相同。
- canonical hash 同时排序完整列与 Tray。
- 节点预算超限抛出 `SolverBudgetExceeded`，不静默返回不可解。

## P1-4：规则单一真源

Solver、Simulator 与 Level solution replay 均直接持有并调用
`core/rules/applyPickToState` 的同一个函数引用；Simulator 的合法动作也直接引用
`core/rules/canPick`。测试使用引用相等断言防止未来另写一套规则。

## Shuffle / Worker

- Fisher-Yates 使用 `SeededRandom`，不调用 `Math.random()`。
- 每次候选重排保持 Tile ID、类型数量、列高与 Tray 不变。
- Worker 内最多尝试 50 次，每次把当前 Tray 纳入 SolverState。
- 失败后按“先清 Tray 中已有 pair，再清 single，最后处理完整 triple”的顺序构造安全取牌序列，
  按固定列高反向回填并再次由 Solver 验证。
- Worker 400ms 超时或报错时会终止线程，走无需搜索的安全构造；两条路径均有假 Worker 测试。

真实 Chrome 验收：

```text
SolverWorker.ts?worker_file&type=module → HTTP 200
lastShuffleStrategy = random
lastShuffleDurationMs = 14
主线程等待期间 eventLoopTicks = 9
打乱后：列高 [2,2,2,2,2,2]，Tray 不变，shuffleUsed = 1
随后撤回：columns / tray / moveCount / rngState 完整恢复
shuffleUsed 保持 1，undoUsed 变为 1
连续打乱结果 [true,true,true,false]，第 4 次正确拒绝
```

## 命令行结果

```text
npm run lint             0 error / 0 warning
npm test                 9 files / 53 tests 全绿
npm run build            通过；SolverWorker 独立 chunk 7.38KB
npm run validate-levels  1/1 schema / count-depth / solvable / solution verified
npm run simulate         Random / Greedy / Cautious 三策略全部输出
```

M2 §64 夹具的 200 次模拟：

```text
Random    fail 37.0%  avgMaxTray 5.96  p95 7
Greedy     fail 0.0%  avgMaxTray 2.00  p95 2
Cautious   fail 0.0%  avgMaxTray 2.00  p95 2
```

## 已知边界与后续项

- `validate-levels` 当前明确报告 1/1 M2 夹具；M3 加入 20 关后才应报告 20/20。
- 失败态 Tray 已满时 Shuffle 无法在“不改 Tray”的硬规则下产生合法下一步，因此失败弹窗保留
  “打乱”位置但置灰；Undo 与 Restart 可用。正常 playing 状态的 Shuffle 完整可用。
- Undo 栈的 localStorage 持久化属于 M5；当前已提供 `exportRecent(5)` / `import()` 数据接口。
- 正式 500ms 洗牌动画、InputQueue 与手感优化属于 M4。
- Vite 对 Phaser 主包仍给出单 chunk 大于 500KB 的提示；实际 gzip 约 345KB，低于当前 3MB
  核心包预算，后续 M4 性能阶段再评估拆包收益。
