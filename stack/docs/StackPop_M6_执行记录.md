# StackPop M6 执行记录

执行日期：2026-08-23  
M5 基线：`8aa646b`  
发布地址：<https://g.ismayday.mobi/stack/>

## 已完成

- 新增根目录 `deploy.sh`，默认 `DRY_RUN=1`。
- Vite 生产 base 使用 `/stack/`。
- 本地生产预览验证 `/stack/` 与哈希 JS 均返回 200。
- 正式发布只写入 `/www/wwwroot/g.ismayday.mobi/stack/`。
- 发布后本地与远端 `index.html` MD5 一致。
- 线上首页返回 HTTP 200。
- 线上 PC 浏览器完成首页、进入首关、合法取牌的冒烟测试，控制台无 error/warning。

## 部署边界验证

脚本在执行安装、构建或 rsync 之前进行硬断言。已实测以下配置均被拦截：

1. `REMOTE_APP_DIR` 等于站点根。
2. `REMOTE_APP_DIR` 指向兄弟项目 `garden/`。
3. `VITE_BASE_PATH` 不是 `/stack/`。

Dry-run 显示远端为首次创建 `stack/`，仅新增 StackPop 的 `index.html`、哈希 JS、Worker 与美术资源；没有站点根或兄弟项目删除项。站点根首页未修改。

## 发布门禁

- 单元测试：13 个文件，83/83 通过。
- `validate-levels`：20/20 Schema、数量/深度、可解性、solution 与难度曲线通过。
- `simulate`：15/15 生成关卡满足 Greedy/Cautious 分化要求。
- `lint`：通过。
- TypeScript + Vite 生产构建：通过。
- 生产依赖审计：`npm audit --omit=dev` 为 0 漏洞。

## 远端核验

- 本地 MD5：`75a3c698bbbe52603ca32e59bdcd11c9`
- 远端 MD5：`75a3c698bbbe52603ca32e59bdcd11c9`
- 首页：HTTP 200，`content-type: text/html`
- WebP：HTTP 200，`content-type: image/webp`
- 远端文件：属主 `www:www`，文件权限 644，目录权限 755/2755。

## 待人工或额外授权项

### 真机验收

仍需在 iPhone Safari 与 Android Chrome 各完成一次真机验收，尤其检查 iPhone 首次交互后的音效。桌面 Chromium 结果不能代替真机音频验证。

### WebP 缓存响应头

线上 nginx 当前的 30 天静态图片规则只匹配：

```text
gif|jpg|jpeg|png|bmp|swf
```

StackPop 使用的 `.webp` 没有返回 `Expires` 或 `Cache-Control`。修正需要改共享站点 nginx 配置并 reload，不属于 `/stack/` 唯一写入目录，未擅自执行。若获授权，建议将 `webp` 加入图片扩展名规则，先 `nginx -t`，再 reload，并复核响应头。

### 站点根入口

未修改站点根首页。是否增加 StackPop 入口卡片需用户另行确认。
