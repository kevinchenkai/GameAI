# 微信小程序操作与发布记录

## 当前壳：正式旅游攻略 0.2.0

当前 `mp/` 已从极简 demo 切换到 `https://g.ismayday.mobi/apec26/`。入口仍为 `pages/home/home`，保留语言、栏目及路线参数；微信内使用右上角菜单转发，联系方式提供二维码和复制链接。首次仅生成预览，用户已反馈真机测试通过，随后已通过官方 CI 上传开发版 `0.2.0`；未提交审核或正式发布。详细结果与上传状态见 [正式攻略预览记录](WECHAT_GUIDE_PREVIEW.md)。

下方最小 demo 的流程与版本记录保留作历史参考；`wechat-demo/` 页面及单文件部署脚本仍可使用，但当前壳和 CI 固定地址检查针对正式攻略。重新生成当前预览：

```bash
export WX_MP_PRIVATE_KEY_PATH='/Users/kk/Work/GameAI/apec26/SecKey/private.wxc3765635c190d693.key'
node apec26/tools/mp-ci/index.cjs preview --desc '0.2.0 正式旅游攻略，中英分享与联系方式测试'
```

`preview` 只生成扫码预览，不新增后台开发版本。要让后台版本管理出现新版本，应在验收并获得上传授权后执行：

```bash
node apec26/tools/mp-ci/index.cjs upload --version 0.2.0 --desc '正式旅游攻略接入，中英切换、微信分享与联系方式适配；真机测试通过'
```

后续迭代改用新的实际版本号。上传开发版、设置体验版、提交审核和正式发布是分别执行的步骤。

## 首次极简 demo：0.1.0–0.1.2

目的：先验证 H5 托管 → web-view 真机加载 → CI 预览／上传 → 后台体验版。此页是流程测试内容，不作为正式旅游服务提交审核。

当前结果：用户已提供微信真机成功截图并确认页面效果。CI 开发版上传与 H5 真机加载已走通，提交审核及正式发布尚未执行。详细配置、排错与迭代步骤见 [首次走通记录](WECHAT_FIRST_SUCCESS.md)。

- H5：https://g.ismayday.mobi/apec26/wechat-demo/ ，英文加 `?lang=en`。
- 页面只有中英切换、四个静态栏目和点击问好；无登录、定位、支付、外链或第三方资源。
- AppID：`wxc3765635c190d693`（公开标识，不是密钥）。
- 小程序源码：`mp/`，只有一个原生页面；业务域名检查保持开启。
- 统一入口：`pages/home/home`。后台体验版“页面路径”、`app.json`、预览入口与分享路径均使用该值，不添加开头的 `/` 或文件扩展名。
- H5 与原有攻略首页独立，单文件部署脚本仅更新 `wechat-demo/index.html`。

## 管理员准备

1. 在小程序后台确认此账号支持 `web-view`（个人类型不支持）。
2. 在「开发管理 → 开发设置 → 业务域名」配置 `https://g.ismayday.mobi`，按后台提示完成域名校验及备案核验。
3. 在「小程序代码上传」生成代码上传密钥 `private.<appid>.key`，建议保存在 GameAI 仓库外；也支持当前已忽略的 `apec26/SecKey/`。Mac 设置权限为 `600`。工具拒绝使用已被 Git 跟踪、未忽略或处于公开／打包目录中的密钥。
4. 为实际运行 CI 的公网出口 IP 配置白名单。本机执行时应配置本机网络出口 IP，而不是 H5 服务器 IP。
5. 需要扫码测试的人员在后台添加为开发者或体验成员，按具体版本权限设置。

上传密钥与 AppSecret 不同；本流程不需要 AppSecret。不要将任一密钥粘贴进聊天、源码、项目配置、Git 或服务器公开目录。域名若需根目录校验文件，依仓库约定另行确认后只部署该文件；本工具不会更改站点根。

## 本地检查与导入开发者工具

在 GameAI 根目录运行：

```bash
node apec26/tools/mp-ci/index.cjs check
node apec26/tools/mp-ci/index.cjs prepare
```

`check` 不联网，不读取密钥，不证明后台权限有效。`prepare` 仅把八个壳文件复制到被 Git 忽略的 `output/wechat-ci/project-*/`，打印可导入开发者工具的目录；AppID 默认从配置读取，也可用 `WX_MP_APPID` 覆盖。也可直接导入 `apec26/mp/`。

H5 本地预览：

```bash
python3 -m http.server 8629 --bind 127.0.0.1 --directory apec26/public
```

打开 `http://127.0.0.1:8629/wechat-demo/`。小程序固定加载 HTTPS 线上地址，本地预览不会替换它。

## 仅发布测试 H5

```bash
bash apec26/scripts/deploy-wechat-demo.sh --dry-run
bash apec26/scripts/deploy-wechat-demo.sh --apply
```

无 `--delete`，不更新原攻略入口。应用后校验本地、服务器、HTTPS 响应 SHA-256 一致。

## CI 安装、预览与上传

SDK 已固定为 `miniprogram-ci@2.1.31`，提交 lockfile；建议使用受支持的 Node.js LTS。SDK 在本地工具目录运行，不包含在小程序包内，不需要对壳页面执行构建 npm。

```bash
npm --prefix apec26/tools/mp-ci ci --ignore-scripts --no-audit --no-fund
npm --prefix apec26/tools/mp-ci test

export WX_MP_APPID="wxc3765635c190d693"
export WX_MP_PRIVATE_KEY_PATH="$PWD/apec26/SecKey/private.$WX_MP_APPID.key"
export WX_MP_ROBOT="1"

node apec26/tools/mp-ci/index.cjs check --credentials
node apec26/tools/mp-ci/index.cjs preview
node apec26/tools/mp-ci/index.cjs upload --version 0.1.2 --desc "深圳 H5 最小流程测试，入口 pages/home/home"
```

将密钥路径改为真实路径，不要将 AppSecret 当成路径或密钥使用。`check --credentials` 仅检查文件格式、权限；微信后台授权、IP 白名单只能在实际调用中确认。预览与上传缺少凭据时直接本地报错，不重试。二维码输出到 `output/wechat-ci/preview-*.png`。

上传成功后由管理员在微信公众平台版本管理中设置体验版；体验版验收通过后才考虑正式服务的审核发布。本工具不会提交审核或发布线上小程序。

## 验收

- iOS／Android 微信打开 H5，图片外的纯 CSS 图形、文字、按钮无溢出。
- 中英切换、点击问好可用，刷新计数重置。
- web-view 内底部标明小程序环境；普通浏览器标明浏览器。
- 微信菜单分享后，接收方打开同一个小程序并保留分享时语言。
- 网络／域名错误触发原生失败页，可重试。
- CI 上传在正确 AppID 的后台出现，当前版本号为 `0.1.2`。

最后三项中涉及真机、后台的结果必须实际测试后记录；本地测试通过不代表小程序流程已经走通。

官方参考：[CI](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html) · [web-view](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html) · [业务域名](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/domain.html)。

## 本次执行记录（2026-10-09）

- 测试 H5 已发布，HTTP 200，本地／服务器／线上响应 SHA-256 一致。原站 78 个网页文件逐字节保持原样。
- 中英文切换、点击计数、320px／390px／1440px 布局通过浏览器检查。
- CI 工具六组本地测试通过；密钥格式、Git 排除和权限检查通过。AppSecret 未写入任何项目文件。
- 官方 SDK 安装完成。实际预览请求已完成壳代码编译，上传压缩包为 1,953 字节。
- 首次预览被 `errCode -10008 / invalid ip: 36.112.24.8` 拦截。管理员随后确认已关闭上传 IP 白名单限制；重试 CI 成功。当时称域名已配置，后续核对发现仅配置了服务器域名，见下方记录。
- 预览二维码已生成，保存在本地忽略目录 `output/wechat-ci/preview-1791601346937.png`；开发版 `0.1.0` 已经通过官方 CI 上传成功，机器人为 `1`，说明为“深圳 H5 最小流程测试”。
- 此时尚未执行设置体验版、提交审核或正式发布；真机结果当时待确认。后续已确认 H5 真机加载成功，交互及分享的逐项验收见首次走通记录。
- 此时尚未创建本轮 Git 提交或推送；已发布的仅为独立测试 H5。用户后续已授权提交及推送本轮 demo、CI 工具和文档，实际提交号以 Git 历史为准。

### 页面入口修复

- 用户真机反馈“页面不存在”，后台“页面路径”为 `pages/home/home`。对旧版实际编译包核对后确认，仅注册 `pages/index/index`，不含后台入口。
- 将单页入口、`app.json`、分享路径与 CI 预览路径统一为 `pages/home/home`。H5 地址不变。
- 在每次预览／上传前调用官方 `getCompiledResult`，校验实际包的八个文件、页面注册及 web-view 模板，保存本地审计 zip。测试覆盖入口缺失、注册不一致和额外文件。
- 修正版开发版 `0.1.1` 已上传成功。当时的预览二维码为 `output/wechat-ci/preview-1791601976601.png`，现已由下方 `0.1.2` 预览替代。
- 此阶段后台若使用体验版，应选择 `0.1.1`，页面路径填写 `pages/home/home` 或留空以使用首页；后续已升级至 `0.1.2`。

### 业务域名与加载诊断

- `0.1.1` 已进入原生首页，手机显示本项目的 web-view 失败页。H5 线上返回 200、TLS 1.2 正常，近期站点日志未见手机请求。
- 用户截图显示配置在“服务器域名 → request 合法域名”，随后明确确认只配置了服务器域名，正在添加独立的“业务域名”。服务器域名配置不授予 web-view 网页访问权限。
- `0.1.2` 已上传：只有 src 准备好才挂载 web-view；失败页显示目标地址、版本与微信提供的错误字段；重试使用新的请求标记。编译包校验及六组本地测试通过。
- `0.1.2` 预览生成成功，当前二维码为 `output/wechat-ci/preview-1791602410460.png`，预览入口为 `pages/home/home`。对应编译包审计为 `output/wechat-ci/compiled-1791602408220.zip`。后台若使用体验版，应选择 `0.1.2`。
- 用户随后授权上传 `/Users/kk/Downloads/fgvFAkRIrb.txt`。两个域名的 Nginx root 均为 `/www/wwwroot/g.ismayday.mobi`，已将单个校验文件部署到根目录，属主 `www:www`、权限 `644`；未更改 Nginx 配置。
- `https://g.ismayday.mobi/fgvFAkRIrb.txt` 与 `https://g.ismayday.com/fgvFAkRIrb.txt` 均返回 200，32 字节响应与本地原文件完全一致。
- 用户最终提供成功截图并确认页面效果；截图保存在 `docs/assets/wechat-first-success-2026-10-09.jpg`。真机 H5 加载已确认，未将截图未覆盖的交互、分享、体验版设置或审核发布自动记为通过。
