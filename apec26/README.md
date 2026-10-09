# APEC26 深圳城市旅行指南

面向深圳 APEC 2026 来访者的中英双语静态 H5，包含深圳旅游、深圳美食、深圳手信与私人地陪。

线上：[中文版](https://g.ismayday.mobi/apec26/) · [英文版](https://g.ismayday.mobi/apec26/?lang=en)。当前内容批次为 2026-10-02，目录于 2026-10-09 整理。

## 目录

| 路径 | 用途 | 部署 |
|---|---|---|
| `public/` | 网站入口、运行脚本、样式、图片与二维码，共 78 个文件 | 是 |
| `data/sources/` | 重建现有商品及评论所需的已审核来源、摘要与核对证据 | 否 |
| `scripts/` | 当前数据构建、核对、采集与验证工具 | 否 |
| `docs/` | 发布说明与当前数据质量报告 | 否 |
| `backup/pre-release-2026-10-09/` | 历史文档、过期工具、原始缓存、截图，以及整理前工具快照 | 否 |
| `release-files.json` | 网站文件的明确发布清单 | 否 |
| `deploy.sh` | 校验清单后只同步 `public/`，入口最后发布 | 否 |

`public/` 内的 v2/v3/v4 文件仍是当前运行依赖。现有页面采用顺序加载与覆盖，不能只按版本号删减。目录调整保持所有网页文件内容及线上相对 URL 不变。

## 预览与校验

在 GameAI 根目录执行：

```bash
python3 -m http.server 8626 --bind 127.0.0.1 --directory apec26/public
```

打开 <http://127.0.0.1:8626/>。四个模块通过 `#travel`、`#food`、`#gifts`、`#guide` 直达。预览只提供 `public/`，研究资料和备份不在网站根目录内。

```bash
python3 apec26/scripts/check-release.py
python3 apec26/scripts/test-data-v7.py
```

首项检查发布清单、文件类型、本地依赖、脚本顺序与 JS 语法；第二项验证署名、去重、SKU／款式关联及无原文缓存时的可重复构建。

## 数据维护

```bash
python3 apec26/scripts/build-product-verification-v7.py
python3 apec26/scripts/build-gifts-v5.py
python3 apec26/scripts/build-reviews-v5.py
python3 apec26/scripts/report-data-v7.py
```

网页数据生成至 `public/`，审核结果生成至 `docs/data-quality/v7/`。采集适配器、公开文档解析器和人工摘要工具仍保留于 `scripts/`；采集原文写入被忽略的 `.cache/research/`，已审核摘要存入 `data/sources/`。构建无需历史备份或原文缓存；未经核对的原文不能直接作为发布数据。

[当前数据质量报告](docs/data-quality/v7/REPORT.md) · [逐店评论缺口](docs/data-quality/v7/restaurant-gaps.json) · [逐 SKU 参数缺口](docs/data-quality/v7/product-gaps.json)。现有 60 条路线、104 个餐厅榜单条目（91 家独立门店）、825 个去重评论键、160 个商品 SKU 与 10 个虚构成年地陪档案。餐厅与商品的剩余缺口按实际取得资料展示；地陪档案用于演示。资料批次日期不代表实时营业、库存或服务状态。

## 发布

```bash
./apec26/deploy.sh --dry-run
./apec26/deploy.sh --apply
```

必须先核对预演。目标仅为 `/www/wwwroot/g.ismayday.mobi/apec26/`；按 `release-files.json` 发布资源，再发布入口，不使用 `--delete`，不同步整个项目目录。新增网页资源时同步更新发布清单。改图使用新文件名；改脚本或样式更新入口中的缓存版本。详细步骤见 [发布说明](docs/RELEASE.md)，本次目录整理结果见 [验收记录](docs/RELEASE_CHECKS.md)。

## 备份

[备份说明](backup/README.md) · [逐文件迁移清单](backup/pre-release-2026-10-09/manifest.json)。历史内容来源、图片生成提示词和旧版 QA 记录均保留在备份中；原始评论缓存与临时截图继续被 Git 忽略。备份不参与构建、预览或部署。
