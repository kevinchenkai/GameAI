# StackPop M0 + M1 执行记录

日期：2026-08-23

## 阶段范围

本轮严格止于策划案 §63 定义的第一轮：工程骨架、响应式布局验证、色块与字母规则原型。
未进入 Undo、Shuffle、Solver、Simulator、20 关、正式美术、存档或部署。

## 命令行结果

```text
npm run lint   通过，0 error / 0 warning
npm test       通过，3 files / 20 tests
npm run build  通过，dist 产出；JS 343.27KB gzip
npm audit --omit=dev  0 vulnerabilities
```

## 规则验收

- Path A：真实浏览器逐列点击 `0,0,1,1,2,2,3,3,4,4,5,5`，最终
  `columns=[0,0,0,0,0,0]`、`tray=[]`、`status=won`。
- Path B：真实浏览器逐列点击 `0,1,2,3,4,5,1`，最终
  `tray=[watering]`、`moveCount=7`、`status=playing`。
- 失败路径：`0,0,1,1,3,3,5`，最终 Tray 7/7、`status=failed`；重新开始后
  `tray=0`、`moveCount=0`、各列高度恢复为 2。
- 首页“开始游戏”按钮经真实 Canvas 点击进入 GameScene。

## 布局验收

截图位于 `output/playwright/`：

- 手机：375×812、390×844、430×932、360×800。
- 重叠档：375×812 下 0.80 / 0.83 / 0.85。
- 桌面：1920×1080、1440×900、1280×700。
- 横屏触屏：896×414 显示“请旋转手机”；桌面 fine pointer 下提示隐藏。

1280×700 首轮截图暴露 Tray 标题与棋盘接近，随后把标题高度纳入纵向预算并补测试。
修复后深度 10 的棋盘底部与 Tray 标题保留 14px 间距，`tileSize=49.51px`，仍高于
48px 下限；桌面最小可用高度确认 700px，并已回写策划案 §45.3 / 附录 B6。

## 待确认

- `OVERLAP_RATIO` 最终值仍需从 0.80 / 0.83 / 0.85 三档截图中人工选择；当前运行默认
  仍按策划推荐值 0.85。
- M1 只用程序绘制色块与汉字占位，不启动 Image Gen；正式美术按工单第 0 批开始，需在
  本阶段确认后另行执行。
