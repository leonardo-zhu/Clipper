## Clipper
专为个人使用打造的 iOS 微信公众号文章离线剪藏工具，无需上架 App Store，自签名即可安装使用。

### ✨ 核心功能
- 📲 一键导入：通过 iOS 系统分享表直接接收微信公众号文章链接，无需复制粘贴
- 📝 完整存档：抓取并保留文章原始HTML排版、图片，WebView 完美还原微信阅读体验
- 🤖 AI 摘要：接入火山方舟豆包大模型，自动生成3-5句话精炼摘要
- 💾 隐私优先：所有数据存在本地 SQLite 数据库，无后端、无用户账号、不上传任何个人数据
- 🏷️ 状态可控：实时展示文章抓取、摘要生成进度，支持一键清理所有失败任务

### 🛠️ 技术栈
基于 Expo + React Native 全栈 TypeScript 开发：
- 框架：Expo SDK 55 Bare Workflow + Expo Router 55 文件路由
- 本地数据库：`@op-engineering/op-sqlite` 高性能 SQLite 驱动
- 分享扩展：`expo-share-intent` 原生适配 iOS 系统分享表
- AI 能力：火山方舟 API（OpenAI SDK 兼容，使用豆包大模型）
- 状态管理：Zustand 极简无样板代码

### ⚠️ 说明
本项目为个人自用MVP版本，未做通用化适配，仅作学习参考，不提供公开分发版本。

### 真机导出 + Mac 分析
1. 在 App 的“导出与存储”页面点击“导出并分享 JSON”
2. 把导出的 `clipper-snapshot-*.json` 传到 Mac
3. 在项目目录执行：

```bash
pnpm analyze /path/to/clipper-snapshot.json
```

说明：
- 这是为真机设计的流程，不依赖 Simulator 沙盒访问。
- `pnpm analyze` 会输出文章总数、状态分布、正文/摘要体积统计。
