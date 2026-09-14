# 深圳，见面吧 · APEC 2026 城市旅行指南

面向深圳 APEC 2026 来访者的中英双语静态 H5 第一版 Demo。

- 线上：https://g.ismayday.mobi/apec26/
- 英文：https://g.ismayday.mobi/apec26/?lang=en
- 原生 HTML / CSS / JavaScript，无框架、构建工具、外部字体或运行时依赖。
- 旅游、美食、手信、私人地陪四个标签页；支持移动端、键盘导航及 `#travel` / `#food` / `#gifts` / `#guide` 直达。
- 语言通过 URL 参数及 localStorage 记忆。切换语言保留当前表单输入。
- 地陪模块仅生成可编辑、可复制的行程需求文本，不上传信息，不创建真实预约。刷新页面会清空需求数据。
- 地图链接打开高德目的地搜索；资料来源在页面底部对话框中可查。

## 本地预览

在 GameAI 根目录执行 `python3 -m http.server 8626 --bind 127.0.0.1`，打开 http://127.0.0.1:8626/apec26/ 。

## 部署

```bash
./apec26/deploy.sh          # dry run，核对范围
./apec26/deploy.sh --apply  # 正式同步
```

仅写 `/www/wwwroot/g.ismayday.mobi/apec26/`，不调整 Nginx，不同步站点根，不删除其他文件。公开文件采用 allowlist，仅 index.html、style.css、app.js、assets/。CSS/JS 修改后更新 HTML 查询版本；图片修改使用新文件名，避免服务器长缓存。

## 内容与配图

整理日期 2026-09-14。来源链接见 app.js 中 `sources`，包括 APEC 官方、深圳市政府和南山区政府。文案独立整理，游玩时长和路线为编辑建议。未宣称 APEC 官方授权，未虚构导游身份、报价或实时可订状态。

三张图使用内置 Image Gen 生成，已压缩为 WebP，总计约 541 KiB。城市建筑、地理关系和商品包装仅为生成式意境，并非实拍。最终提示词及文件对应关系见 [IMAGE_PROMPTS.md](IMAGE_PROMPTS.md)。

## 验证

- `node --check apec26/app.js`。
- Playwright 检查中英两语言 × 320 / 390 / 768 / 1440 px × 四模块，无横向溢出。
- 检查地图链接、游玩提示展开、方向键标签切换、来源弹窗和 Escape 关闭。
- 地陪需求生成保留原始文本，语言切换保留草稿；复制失败可手动选择文本。
- 发布后检查公开入口、静态资源 HTTP 状态、本地与远程文件摘要。

Git 使用 GameAI 已配置的 author / committer，附 Codex co-author trailer；本任务仅本地提交，不自动推送远端。
