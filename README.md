# Codex Viz Plus

<p align="center">
  <img src="./docs/preview/home.png" alt="首页预览" width="49%" />
  <img src="./docs/preview/sessions.png" alt="会话列表预览" width="49%" />
</p>

Codex Viz Plus 是基于 [onewesong/codex-viz](https://github.com/onewesong/codex-viz) 改造的本地会话分析面板。
它继续读取本机 Codex CLI 的 JSONL 历史，同时补上了模型识别、费用估算、今天筛选、备份/恢复和更完整的列表信息展示。

如果你想快速看清“今天跑了多少会话”“花了多少 Token”“大概花了多少钱”，同时还能把历史会话备份出去，这里会比原版更直接。

## 新增功能 / New Features

- 会话模型识别 / Session model detection：从原始 `turn_context.payload.model` 读取模型
- 会话列表增强 / Rich session list：新增模型、Token 总量、费用、费用明细列
- 两行列表布局 / Two-line list layout：主行显示核心信息，第二行显示 `cwd` 和费用拆分
- 费用估算 / Cost estimation：按输入、缓存输入、输出三段单价拆分计算
- 今天筛选 / Today filter：首页支持一键切换“看今天 / 看全部”
- 今天全局联动 / Global today scope：首页总览、趋势图、工具榜、词云都能按当天过滤
- 模型搜索 / Model search：会话列表搜索支持按模型名匹配
- 详情增强 / Session details：会话详情页展示模型、Token 统计和费用拆分
- 备份与恢复 / Backup and restore：支持全量备份、增量备份、恢复备份
- Windows 路径支持 / Windows path support：备份与恢复都支持 `C:\...` 格式

## 费用怎么算 / How pricing is calculated

- `缓存了多少` / `Cached input` = `tokensCachedInput`
- `未缓存输入` / `Non-cached input` = `max(tokensInput - tokensCachedInput, 0)`
- `缓存比例` / `Cached ratio` = `tokensCachedInput / tokensInput`，如果 `tokensInput = 0`，则显示 `—`
- `缓存价格` / `Cached input price` = `cached input price / 1M tokens`
- `没缓存价格` / `Input price` = `input price / 1M tokens`
- `输出价格` / `Output price` = `output price / 1M tokens`
- `总费用` / `Total cost` = `未缓存输入费用 + 缓存输入费用 + 输出费用`
- 如果模型没有对应公开价格，则费用显示 `无公开价格，未统计` / If no public pricing exists for a model, cost is shown as `No public price, not estimated`

## Backup

- `增量备份`：基于上次备份清单对比 `mtime + size`，只复制新增或变更文件
- `全量备份`：复制当前所有原始 JSONL 文件到目标目录
- `恢复备份`：恢复时会自动跳过目标中已存在的文件，避免重复恢复
- 备份和恢复都会保留原始目录结构

## English Notes

- This project is a local session analytics dashboard based on [onewesong/codex-viz](https://github.com/onewesong/codex-viz).
- It reads Codex CLI JSONL history locally and adds model detection, cost estimation, today scope filtering, and a richer session list.
- The list view is now two lines per session so core metrics stay visible while `cwd` and cost details remain readable.
- Backup supports full and incremental modes, and restore skips files that already exist in the destination.

## 快速开始

```bash
pnpm i
pnpm dev
```

打开 `http://localhost:3000`

## 配置

- `CODEX_SESSIONS_DIR`：默认 `~/.codex/sessions`
- `CODEX_VIZ_CACHE_DIR`：默认 `~/.codex-viz/cache`

## 说明

本项目保留原始 MIT License 约束，详见 `LICENSE`。
