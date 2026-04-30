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
