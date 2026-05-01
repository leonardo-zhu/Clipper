# Clipper V2 大版本更新方案（评审稿）

更新时间：2026-05-02
适用版本：基于当前 MVP（Expo 55 + SQLite + 本地队列）

---

## 1. 背景与目标

本次 V2 重点不是堆功能，而是优化首屏导入体验与信息组织能力，具体目标：

1. 多语言支持：至少支持中文（简体）与英文，后续可扩展。
2. 流程优化：从“分享打开 App”到“摘要完成可读”的感知路径更清晰，减少用户等待焦虑。
3. 标签管理：AI 自动打标，同时保留可控的预设基础标签体系。

非目标（本期不做）：

1. 云同步/多端账号系统。
2. 后端任务编排服务（仍保持本地处理）。
3. 复杂标签运营后台。

---

## 2. 现状与问题

基于当前代码：

1. 当前分享后直接入库并后台跑 `pending -> fetching -> summarising -> done/error`，但缺少“独立导入页”，用户对过程感知弱。
2. 首页只展示通用“处理中”，不能区分“抓取中”和“AI 总结中”的心理阶段。
3. UI 文案硬编码中文，不具备 i18n 扩展能力。
4. 标签体系尚未落地，后续筛选与检索能力受限。

---

## 3. V2 目标流程（关键）

### 3.1 用户路径（你定义的流程落地）

1. 用户在微信公众号点击“分享”，选择“用 Clipper 打开”。
2. App 进入 Ingestion 页面（新页面），立即展示“正在抓取微信内容”。
3. Ingestion 阶段只关注并展示 `title` 和 `description` 提取进度。
4. 提取完成后，显示 “Move to Home” CTA；用户返回首页。
5. 注意：在步骤 4 时后台已进入 summary 阶段（并行，不阻塞返回）。
6. 首页对应文章卡片展示“AI generation summary 正在进行中”的进度条和动效，完成后切换为“已摘要”。

### 3.2 建议状态机（兼容现有）

在现有 `ArticleStatus` 基础上扩展为：

1. `queued`：刚接收分享链接。
2. `ingesting`：抓取 title/description 中。
3. `ingested`：title/description 已落库，可回首页。
4. `summarising`：AI 摘要中。
5. `done`：摘要完成。
6. `error`：失败。

说明：

1. 现有 `pending/fetching` 可迁移并折叠到 `queued/ingesting`。
2. `ingested` 是新关键节点，用于“可返回首页”与“后台继续处理”的切分。

---

## 4. 信息架构与数据模型调整

### 4.1 表结构建议（articles）

新增字段：

1. `description TEXT`：文章描述（抓取阶段产物）。
2. `profile_signature TEXT`：公众号签名/简介文案。
3. `msg_cdn_url TEXT`：微信主图（首页长图来源，示例比例约 `719:720`）。
4. `cover_url_1_1 TEXT`：Collection 图源字段（设计稿中用于方图展示）。
5. `lang TEXT`：内容语言（如 `zh-CN`/`en-US`，可由规则或 AI 推断）。
6. `ingested_at INTEGER`：完成 ingest 时间。
7. `summarising_progress INTEGER`：0-100，初期可伪进度。

状态字段更新：采用 3.2 的新状态集合。

### 4.2 标签模型建议

新增两张表：

1. `tags`
   - `id TEXT PRIMARY KEY`
   - `name TEXT NOT NULL UNIQUE`
   - `type TEXT NOT NULL`（`preset` | `ai` | `user`）
   - `locale TEXT`（可选）
2. `article_tags`
   - `article_id TEXT NOT NULL`
   - `tag_id TEXT NOT NULL`
   - `source TEXT NOT NULL`（`preset_rule` | `ai` | `manual`）
   - 联合唯一键 `(article_id, tag_id)`

收益：支持标签筛选、来源追踪、后续人工修正。

---

## 5. 多语言方案（i18n）

### 5.1 范围

本期覆盖：

1. 首页、Ingestion 页、详情页关键状态文案。
2. 弹窗按钮文案。
3. 错误提示文案。

### 5.2 技术方案

1. 新建 `src/i18n/`，维护字典文件：
   - `zh-CN.ts`
   - `en-US.ts`
2. 提供轻量 `t(key, params?)` 工具函数。
3. 语言来源优先级：
   - 用户手动设置（若后续加设置页）
   - 系统 Locale
   - 默认 `zh-CN`
4. 所有 UI 文案禁止继续硬编码。

### 5.3 文案 Key 规范

采用页面域前缀：

1. `ingestion.fetchingTitle`
2. `ingestion.moveToHome`
3. `home.aiSummaryInProgress`
4. `status.done`
5. `status.error`

---

## 6. 流程优化实现方案

### 6.1 新增 Ingestion 页面

路由建议：`/ingestion/[id]`

页面职责：

1. 展示抓取进度状态（文案 + 动效）。
2. 展示抓取得到的 `title` 与 `description`（占位到真实值）。
3. 在 `ingested` 状态时显示 CTA：“Move to Home”。
4. 视觉上展示封面、标题、description、来源号信息（profile_signature）。

### 6.2 队列拆分（关键）

将当前单流程改成两阶段：

1. `runIngestion(id)`：抓 title + description，落库，状态 `ingested`。
2. `runSummarisation(id)`：异步继续摘要，状态 `summarising -> done/error`。

触发策略：

1. `processUrl(url)` 创建记录后立即导航到 ingestion 页面。
2. ingestion 完成后自动启动 summarisation（无需等待用户点击）。

### 6.3 首页动效和进度条

在 `summarising` 时展示：

1. `AI generation summary` 文案（国际化）。
2. 进度条（可先用时间驱动伪进度，完成时强制 100%）。
3. 轻量 shimmer/rolling 动效，避免重动画导致掉帧。

---

## 6.4 UI 大版本更新（设计稿驱动）

本次 UI 不做“局部修补”，按新设计稿整体升级。实现原则：

1. 视觉结构重做：首页、Ingestion 页、详情页的信息层级与当前版本解耦，不沿用旧卡片布局。
2. 元信息前置：文章列表优先展示封面图、title、description，而不是仅标题+状态徽标。
3. 状态视觉分层：
   - ingesting：抓取中动画（偏系统反馈）
   - summarising：AI 进度条动画（偏任务反馈）
   - done/error：结果态对比明显
4. 动效策略：只保留关键过渡动画（进入 ingestion、进度条推进、完成态切换），不堆叠花哨微动效。
5. 兼容性：保证 iPhone 主流尺寸下安全区与滚动行为一致（特别是有长图封面的卡片高度）。

页面级更新建议：

1. Ingestion 页：
   - 顶部：抓取状态 + 来源域名
   - 中部：封面预览（优先 1:1，回退主图）+ title/description skeleton -> 实值
   - 底部：Move to Home CTA + 后台 summary 提示
2. 首页：
   - 文章卡片主视觉使用 `msg_cdn_url`（长图样式）
   - summarising 状态显示“AI generation summary”滚动条
   - done 状态展示摘要首句与标签 chips
3. Library / Collection：
   - Collection 卡片使用 `cover_url_1_1` 图源（1:1 视觉模板）
   - 保持与 Home 的图片区分（Home 长图、Collection 方图）
3. 详情页：
   - 文章正文前增加“信息头部区”：封面、description、标签、摘要状态
   - 保留 WebView 正文渲染，但外层容器样式与新视觉统一

---

## 6.5 微信 HTML 元数据提取增强（新增）

你给的示例变量可直接进入提取规则层，作为 ingest 阶段核心数据源：

1. `profile_signature` -> `profile_signature`
2. `msg_cdn_url` -> `msg_cdn_url`（首页长图）
3. `cdn_url_1_1` -> `cover_url_1_1`（Collection 方图）

提取策略（按优先级回退）：

1. 先从脚本变量解析（regex/AST 简化解析）。
2. 再从页面 meta 标签补全（如 og:image、description）。
3. 最后回退正文首图（若无官方封面变量）。

图片使用规则（按设计稿）：

1. Home：使用 `msg_cdn_url` 渲染长图卡片。
2. Library Collection：使用 `cover_url_1_1` 渲染方图卡片。
3. 若某字段缺失，再回退到另一字段，确保有图可展示。

description 来源优先级：

1. 微信显式变量（若可得）。
2. `meta[name='description']`。
3. 首段正文摘要截断（兜底）。

description 展示规则：

1. 不做行数截断（按你设计稿要求完整展示）。
2. 仅在极端超长内容下做安全折叠（后续可配阈值，不作为本期默认行为）。

---

## 6.6 i18n 边界定义（必须明确）

i18n 仅作用于“App 界面语言”，不改写“文章内容语言”：

1. 需要 i18n 的部分：
   - 导航、按钮、状态文案、系统提示、空态文案、错误文案
   - 如 `Move to Home`, `AI generating summary...` 等 UI 文本
2. 不做 i18n 翻译的部分：
   - 文章 title、description、正文、公众号签名（`profile_signature`）
   - 这些内容保持原文（可能是中文或英文）
3. 摘要语言策略：
   - 默认跟随文章主体语言（自动检测）
   - 用户可在后续版本手动覆盖（V2 不强制实现设置入口）

---

## 7. 标签管理方案

### 7.1 预设基础标签（首批）

建议先内置一组跨场景标签（中英双语映射）：

1. 产品/Product
2. 技术/Engineering
3. AI
4. 创业/Startup
5. 商业/Business
6. 运营/Marketing
7. 设计/Design
8. 个人成长/Self-Improvement

### 7.2 打标策略（V2）

1. 规则预打标：基于标题关键词匹配预设标签（低成本、可解释）。
2. AI 打标：摘要完成后由模型返回 2-5 个标签。
3. 合并去重：`preset + ai` 合并，规范化后写入 `article_tags`。

### 7.3 交互建议

1. 首页增加标签筛选入口（可后置到 V2.1）。
2. 详情页展示标签 Chips。
3. 保留手动增删标签能力到 V2.1（本期可先只读展示）。

---

## 8. 分阶段交付计划（Plan Mode）

### Phase 0：方案冻结（0.5 天）

1. 确认状态机命名。
2. 确认首批预设标签。
3. 确认中英文关键文案。

### Phase 1：基础设施（1 天）

1. 数据库迁移：新增字段与标签表。
2. i18n 基础能力接入（`t()` + 语言解析）。
3. 状态枚举与查询逻辑调整。

### Phase 2：流程落地（1-1.5 天）

1. 新建 Ingestion 页面。
2. 队列改造为 ingest/summarise 两阶段。
3. 分享后路由跳转到 ingestion。

### Phase 3：体验增强（1 天）

1. 首页 summarising 进度条 + 动效。
2. ingest/summarise 错误文案细化与重试动作。
3. 标签自动生成与展示。

### Phase 4：回归与发布准备（0.5-1 天）

1. 中英文回归。
2. 关键流程端到端测试（分享 -> ingest -> home -> done）。
3. 文档更新与发布说明。

---

## 9. 验收标准（Definition of Done）

1. 从微信分享打开后，100% 进入 Ingestion 页面。
2. Ingestion 页面可见 title/description 抓取结果或明确失败提示。
3. 用户可在 ingestion 完成后一键回首页。
4. 首页可见 `AI generation summary` 进行中状态和进度反馈。
5. 至少中英双语可切换或可跟随系统语言。
6. 每篇文章至少有 1 个标签（预设或 AI）。
7. 微信文章可稳定提取 description 与至少一种封面图 URL。
8. 在有 `msg_cdn_url` 与 `cover_url_1_1` 的文章中，Home 与 Collection 分别使用正确图源渲染。

---

## 10. 风险与缓解

1. 微信页面结构变动导致 description 抓取失败：
   - 缓解：提供多 selector 回退 + 空值容错文案。
2. 本地并发任务导致状态错乱：
   - 缓解：每条任务引入阶段锁，避免重复 summarise。
3. i18n 改造范围扩散：
   - 缓解：先收敛到核心页面和状态文案，非核心文案后补。

---

## 11. 需要你确认的决策

1. 状态命名是否采用 `queued/ingesting/ingested/summarising/done/error`。
2. Ingestion 完成后 CTA 文案：是否固定英文 `Move to Home`，还是按语言显示。
3. 首批预设标签是否采用第 7.1 列表。
4. V2 是否包含“手动编辑标签”，还是只做“自动生成+展示”。
5. Home 长图与 Collection 方图是否严格按设计稿固定映射（不做自动比例推断）。
