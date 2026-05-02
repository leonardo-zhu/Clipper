# Clipper 进展与路线图（2026-05-01）

## 已完成

### 命名与工程
- 项目目录与品牌从 `WeChatClipper` 改为 `Clipper`
- iOS 工程名、bundle id、scheme、app group 已切换到 `clipper` 命名

### UI 与交互
- 首页重构为分层视觉样式（品牌头图、统计、筛选、卡片列表）
- 首页顶部改为沉浸式 + Safe Area 处理，避免状态栏遮挡
- 详情页滚动与渲染参数优化
- 详情页改为微信公众号风格阅读布局（白底标题+来源时间+正文）
- “打开原文”改为优先唤起微信，失败回退浏览器
- 图标去除外层白边视觉

### 存储方案
- 放弃 Simulator 专用目录管理工具
- 改为真机优先：App 内导出 JSON 快照
- 新增 Mac 分析脚本：`scripts/analyze.js`
- 新增命令：`pnpm analyze <snapshot.json>`

### V2 数据迁移能力（2026-05-02）
- 首页 `+` 按钮扩展为双入口：手动粘贴微信链接 / 导入 Snapshot JSON
- Storage 页面新增“导入 JSON 文件”能力（读取历史导出快照）
- 导入逻辑支持按 URL 去重更新（已存在则更新，不重复入库）
- 历史状态自动兼容映射：`pending -> queued`、`fetching -> ingesting`
- 导入完成后返回新增/更新/跳过统计结果

## 当前推荐流程（真机）

1. App 中进入“导出与存储”
2. 点击“导出并分享 JSON”
3. 在 Mac 执行：

```bash
pnpm analyze /path/to/clipper-snapshot.json
```

## 下一步

1. 导出格式增加版本号字段（兼容后续 schema 演进）
2. `pnpm analyze` 增加 `--top`（大正文文章排行）
3. 可选：导出时拆分为 `metadata + body` 两个文件，减少单文件体积
4. 导入后增加“缺失元数据补全任务”（description / msg_cdn_url / cover_url_1_1）

## 本轮更新（2026-05-02，Round 2 UI）

### 已完成
- Home 页面视觉重绘：
  - 统一品牌头部样式（标题 + 副标题 + 操作按钮）
  - 卡片层级、阴影、间距和进度条样式优化
  - 空状态与 FAB 冲突处理：空状态时显示主 CTA；有数据时显示悬浮 `+`
- Home `+` 弹层优化：
  - 两条入口清晰分离：`粘贴微信链接` / `导入 Snapshot JSON`
  - 链接输入态与按钮文案优化（“开始抓取”）
- Library 页面视觉对齐：
  - 明确 `Collection` 使用 1:1 图（`cover_url_1_1`）
  - 字体、卡片边框、阴影、信息层次与 Home 保持一致
- Storage 页面 UI 重绘：
  - 导入、导出、命令区改为统一信息卡结构
  - 导入/导出按钮状态（进行中）视觉明确

### 验证
- `pnpm typecheck` 已通过

## 本轮更新（2026-05-02，Round 5 Parsing + Tag Fit）

### 已完成
- 微信文章抓取字段修正：
  - title 优先取 `var msg_title = '...'.html(false);`
  - description 优先取 `<meta name="description" ...>`
  - 保留 `h1.rich_media_title` 作为 fallback
- 标签样式继续收紧：
  - 筛选 chip 固定高度与垂直居中
  - 标签 pill 收紧并统一中英文可读性

### 验证
- `pnpm typecheck` 已通过

## 本轮更新（2026-05-02，Round 4 Tags）

### 已完成
- 标签基础能力分层：
  - 预设基础标签 `BASE_TAGS`
  - AI/规则生成标签仍可继续扩展
  - 卡片展示时区分基础标签与 AI 标签样式
- 标签筛选入口：
  - Home 增加横向筛选条
  - Library 增加同款筛选条
  - 两个页面都支持按标签过滤列表

### 验证
- `pnpm typecheck` 已通过

### 下一步（Round 3）
1. 导入流程内联化：不离开 Home 也能直接完成文件导入（可选）
2. 标签管理：预设基础标签 + AI 标签并存策略与 UI 展示
3. Ingestion / Summarising 阶段动效继续贴近设计稿（进度与状态反馈细化）

## 本轮更新（2026-05-02，Round 3 UX）

### 已完成
- Home `+` 弹层新增“直接导入 JSON”能力：
  - 不再强制跳转 Storage 才能导入
  - 导入后直接刷新首页列表并给出新增/更新/跳过统计
- Ingestion 页面状态反馈增强：
  - 增加抓取说明文案（title/description/cover metadata）
  - 补齐占位封面与状态占位文案
  - 在 summarising 阶段显示进度条与状态提示
  - 视觉样式与 Home/Library 统一（色彩/圆角/边框）

### 验证
- `pnpm typecheck` 已通过
