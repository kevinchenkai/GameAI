# 发布说明

本次为发布前目录整理，网页内容与上一版一致。网站根目录固定为 `public/`，`backup/`、`data/`、`scripts/`、`docs/` 均不公开。

## 校验

在 GameAI 根目录执行：

```bash
python3 apec26/scripts/check-release.py
python3 apec26/scripts/test-data-v7.py
./apec26/deploy.sh --dry-run
```

检查清单与 `public/` 实际文件完全一致，页面本地依赖存在，16 个脚本按原顺序加载，数据可从已审核资料逐字节重建。预演应只涉及目标 apec26 子目录；当前目录整理没有改变网页文件，预演应不需要更新网页内容。

## 发布与回滚

确认发布后执行 `./apec26/deploy.sh --apply`。部署只使用明确清单中的文件，先资源、后入口，不删除服务器其他文件。发布后核对本地与服务器文件校验值，并检查中英文页面、路线分享、食物详情、商品询价及二维码入口。

Git 推送目标为 `origin main` 与 `ezone main:master`。保留用户 author／committer，提交附 `Co-authored-by: Codex <codex@openai.com>`。回滚使用已有版本的 Git 历史与对应部署脚本；对已推送版本使用 `git revert`，保持双远端一致。

## 数据与历史资料

当前 [数据质量报告](data-quality/v7/REPORT.md)、[评论缺口](data-quality/v7/restaurant-gaps.json)、[商品缺口](data-quality/v7/product-gaps.json) 保留实际限制。历史内容来源与生成记录位于 [备份说明](../backup/README.md) 所列路径。当前审核事实保存在 `data/sources/`，原始正文或页面缓存放在忽略的 `.cache/`。
