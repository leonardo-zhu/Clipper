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

## 本轮更新（2026-05-02，Round 10 i18n Finish）

### 已完成
- Ingestion 页面硬编码文案 i18n 化
- Storage 页面提示/按钮/卡片标题 i18n 化
- 新增导出成功/失败文案 key，导入导出提示统一到 i18n

### 验证
- `pnpm typecheck` 已通过

## 本轮更新（2026-05-02，Session B Round 11 UI Polish）

### 已完成
- Home 视觉细化（对齐 design token）：
  - 背景色、卡片圆角、边框、阴影层级统一
  - 空状态文案与主按钮尺寸按设计收敛
  - 标签筛选条与标签 pill 字号/行高统一，降低中文视觉膨胀
  - 导入弹层（sheet）字体体系、边框、遮罩透明度优化
- Ingestion 动效增强：
  - 进度条新增 shimmer 滚动层，强化 “AI generation summary 正在进行中” 反馈
  - 页面颜色体系与 Home/Library 同步
- Library 视觉同步：
  - Collection 卡片层级与 Home 保持一致
  - 标签 chip 与标题比例微调，减少错位感

### 验证
- `pnpm typecheck` 已通过

## 本轮更新（2026-05-02，Session B Round 12 Full UI Finish）

### 已完成
- Ingestion 页面收尾：
  - 卡片层级、CTA 比例、标题层次与背景氛围光斑统一
  - 进度动效（shimmer）保留并强化“AI 生成中”感知
- Article 页面收尾：
  - 标签区字体、chip 密度、输入/按钮样式统一到 V2 视觉语言
  - WebView 外层背景与其它主页面统一
- Library 页面收尾：
  - 空状态按钮文案接入 i18n（`library.backHome`）

### 验证
- `pnpm typecheck` 已通过

## 本轮更新（2026-05-02，Round 9 i18n Boundary）

### 已完成
- 新增 UI 文案 i18n key（中英）：
  - Home 导入弹层、空状态、错误/完成提示
  - Library/Storage 顶部导航文案
  - 详情页标签编辑区文案
- 保持边界：
  - 仅 UI 文案做 i18n
  - 文章内容字段（title/description/body）不参与翻译

### 验证
- `pnpm typecheck` 已通过

## 本轮更新（2026-05-02，Round 8 Parsing Fallback）

### 已完成
- 抓取 title/description 再增强：
  - title 新增 `og:title` fallback
  - description 新增 `og:description` fallback
- 首页标签筛选条边缘体验微调（右侧留白避免视觉裁切）

### 验证
- `pnpm typecheck` 已通过

## 本轮更新（2026-05-02，Round 7 Tag Efficiency）

### 已完成
- 详情页标签编辑增强：
  - 基于全库标签频次生成“快速添加”建议
  - 点击建议标签可一键添加到当前文章
- 标签工具新增频次聚合函数，支持后续推荐策略扩展

### 验证
- `pnpm typecheck` 已通过

## 本轮更新（2026-05-02，Round 6 Tag Editing）

### 已完成
- 详情页新增标签编辑区：
  - 展示当前标签（基础标签 / AI 标签分色）
  - 点击标签可移除
  - 支持手动新增标签（输入 + 提交）
- 标签修改直接写回 `tags_json` 并即时刷新页面状态

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

### Round 4（Session A UI 收口）
- Home 空状态与 Add 入口冲突优化：仅在无文章时显示中部 CTA，有文章后恢复右下角 FAB，避免双入口并存。
- 标签 chip 统一字号与行高（10/12）并关闭 includeFontPadding，修复中英混排导致的视觉错位问题（Home/Library/Article）。
- Storage 导入卡片视觉强化：导入卡高亮（浅绿背景 + 边框），与导出卡形成主次层级。
- 本轮仅做 UI/样式收口，不改动导入导出和抓取逻辑。

### Round 5（Session A 逻辑增强）
- 微信抓取增强：`cover_url_1_1` 与 `cdn_url_1_1` 双字段兼容，JS 变量支持单双引号。
- 标签逻辑增强：标签 canonical 归一化（空白/大小写），避免重复标签导致筛选与推荐不一致。
- 导入兼容逻辑抽取：新增 `src/lib/importer.ts` 统一状态映射与导入 patch 规则，Home/Storage 共用。
- 回归检查增强：新增 `pnpm check:i18n`、`pnpm check:state-flow`、`pnpm check:all`。

### Round 6（Session A 迁移脚本）
- 新增快照迁移脚本：`pnpm migrate:snapshot <input.json> [output.json]`
- 迁移内容：状态值映射、`cdn_url_1_1 -> cover_url_1_1` 兼容、标签去重规范化、空白文本清洗。
- 输出结构新增 `schemaVersion: 2` 与 `migratedAt`，便于后续导入追踪。

### Design Contract（强约束）
- 新增 `docs/design-system-contract.md`，把 `DESIGN.md` 与各 screen `code.html` 定义为 V2 UI 唯一视觉真源。
- 规则升级：颜色、字体、间距、圆角必须按 token/HTML 值实现，禁止自行推断或“风格化调整”。
- 详情页若设计稿无标签编辑控件，则必须移除相关 UI（add/quick-add/tag editor）。

### Round 13（Design Fidelity Hardening）
- 新增设计强约束文档：`docs/design-system-contract.md`，将 `DESIGN.md` + screen `code.html` 设为唯一视觉真源。
- Router/底部导航继续收口：移除与设计稿无关入口，底部导航改为 Home/Library 双项并统一到设计稿结构。
- 详情页移除未在设计稿出现的标签编辑控件（add tag / quick add / tag editor），避免产品范围漂移。
- Home 标签条间距改为稳定生效方案（`ItemSeparatorComponent`），修复 RN `gap` 不稳定导致的视觉偏差。
- Library 页面按 `library_collections_updated/code.html` 重构：TopAppBar、Collection 网格、Recent Collections 列表结构对齐。
- Library 列表新增左滑删除交互，删除操作连通现有数据层 `removeArticle`。
- 修正 icon 偏差：删除图标改为垃圾桶，Sort 图标替换为更接近高保真语义的实现。
- Library 列表卡片密度（内外间距、图文比例、标题/描述行高）收紧到接近高保真节奏。

### 验证
- `pnpm check:all` / `pnpm typecheck` 已通过。
