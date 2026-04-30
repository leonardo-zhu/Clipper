# Clipper — MVP Build Spec

> 原始设计文档，已更新为实际使用的版本。
> Target: personal-use iOS app, never published to App Store.

---

## 0. What we're building

A personal iOS app that receives WeChat article links via the iOS Share Sheet,
fetches the full article body, generates an AI summary, and stores everything locally.
No backend server. No user accounts. One person, one device.

---

## 1. Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Expo SDK 55, Bare Workflow | Needs native Share Extension target |
| Package manager | pnpm | 项目规范要求 |
| Language | TypeScript (strict) | Throughout |
| JS runtime (device) | Hermes (default for RN) | Standard; pnpm is dev-toolchain only |
| Local DB | `@op-engineering/op-sqlite` | Fast SQLite for RN |
| Share Extension | `expo-share-intent` | iOS Share Extension wiring |
| HTTP client | Native `fetch` (RN built-in) | No CORS in RN; no extra lib needed |
| HTML parser | regex + div nesting counter | 见 scraper 章节 |
| Article rendering | `react-native-webview` | 完整还原微信排版、图片 |
| AI summary | 火山方舟 API (OpenAI SDK 兼容) | `openai` SDK, `responses.create` |
| State management | Zustand | Simple, no boilerplate |
| Navigation | Expo Router v55 | File-based routing |

### 实际版本对照

| 包名 | 实际使用版本 |
|---|---|
| expo | **55.0.18** |
| react | **19.2.0** |
| react-native | **0.83.6** |
| expo-router | **55.0.13** |
| expo-share-intent | **6.1.0** |
| @op-engineering/op-sqlite | **15.2.12** |
| zustand | **5.0.12** |
| react-native-webview | **13.16.1** |
| openai | **6.35.0** |

---

## 2. Repo structure

```
Clipper/
├── app/
│   ├── _layout.tsx          # Root layout, DB init, share intent listener
│   ├── +native-intent.tsx   # 拦截 share intent URL，防止路由报错
│   ├── index.tsx            # Feed screen (article list)
│   └── article/[id].tsx     # Article detail (WebView 渲染)
├── src/
│   ├── db/
│   │   ├── index.ts         # DB connection init
│   │   ├── schema.ts        # SQLite table definitions
│   │   └── queries.ts       # All DB read/write functions
│   ├── lib/
│   │   ├── scraper.ts       # fetch + HTML 提取（保留原始 HTML）
│   │   ├── summarise.ts     # 火山方舟 API 调用
│   │   └── queue.ts         # 处理队列 + Zustand store 通知
│   └── store/
│       └── articles.ts      # Zustand store
├── docs/
│   └── clipper-spec.md
├── assets/
│   └── icon.png
├── .env.local               # API key（not committed）
└── .gitignore
```

---

## 3. Database schema

```sql
CREATE TABLE IF NOT EXISTS articles (
  id         TEXT PRIMARY KEY,
  url        TEXT NOT NULL UNIQUE,
  title      TEXT,
  body       TEXT,          -- 存储原始 HTML（用于 WebView 渲染）
  summary    TEXT,
  source     TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
-- status: 'pending' | 'fetching' | 'summarising' | 'done' | 'error'
```

---

## 4. Share Extension wiring

`expo-share-intent` 处理 iOS Share Extension。微信分享过来的数据格式：

```json
{ "weburls": [{"url": "https://mp.weixin.qq.com/s/xxx", "meta": ""}], "type": "weburl" }
```

注意：微信只分享 URL，不包含标题等元数据，标题需要从 HTML 解析。

### +native-intent.tsx

Expo Router 会把 share intent 的 deep link（`clipper://dataUrl=...`）当作路由匹配，
导致 "No Page Route" 错误。通过 `+native-intent.tsx` 在路由层面拦截：

```typescript
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.includes('dataUrl=')) {
    return '/';  // 重定向到首页，不走路由匹配
  }
  return path;
}
```

---

## 5. Scraper

核心改动：**保留原始 HTML**（不再 strip tags），用于 WebView 渲染。

### Body 提取

微信文章的 `js_content` div 嵌套很深，非贪婪 regex 会在错误位置截断。
改用 **div 嵌套计数** 找到正确的闭合标签：

```typescript
const contentStart = html.indexOf('id="js_content"');
const openDivIdx = html.lastIndexOf('<div', contentStart);
let depth = 0, i = openDivIdx, closeIdx = -1;
while (i < html.length) {
  if (html.substring(i, i + 4) === '<div') { depth++; i += 4; }
  else if (html.substring(i, i + 6) === '</div>') {
    depth--;
    if (depth === 0) { closeIdx = i; break; }
    i += 6;
  } else { i++; }
}
```

### HTML 清理

保留原始 HTML 结构，只做必要的清理：

- 移除 `<script>` / `<style>` 标签
- 移除 `visibility: hidden; opacity: 0`（微信默认隐藏内容）
- `data-src` → `src`（微信图片懒加载）

### Title 提取

微信的 class 有尾部空格 `rich_media_title `，regex 需要 `\s*`：

```typescript
/<h1[^>]*class="rich_media_title\s*"[^>]*>([\s\S]*?)<\/h1>/
```

---

## 6. AI summary

使用火山方舟 Responses API。HTML 先 strip tags 转为纯文本再传给 LLM。

```typescript
const response = await client.responses.create({
  model: 'doubao-seed-2-0-lite-260215',
  input: `用3-5句话总结以下文章，输出纯中文，无需任何标题或前缀：\n\n${text.slice(0, 6000)}`,
});
return response.output_text ?? '摘要生成失败';
```

### API 配置

```env
EXPO_PUBLIC_VOLCENGINE_API_KEY=your-api-key-here
EXPO_PUBLIC_VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
EXPO_PUBLIC_VOLCENGINE_MODEL=doubao-seed-2-0-lite-260215
```

注意：base URL 是 `volces.com` 不是 `volcengineapi.com`。

---

## 7. Processing queue + 状态通知

`queue.ts` 在每次 DB 写入后，通过 `useArticlesStore.getState().loadArticles()` 直接更新 Zustand store。
订阅了 store 的组件自动 re-render，无需轮询。

```
processUrl → DB write → notify() → store.loadArticles() → React re-render
```

---

## 8. UI screens

### Feed (`app/index.tsx`)

- FlatList of articles ordered by `created_at DESC`
- 每行：title、source domain、status badge、日期
- Status badge：`处理中` = amber, `已摘要` = green, `失败` = red
- 顶部横幅：有失败文章时显示「清除 X 篇失败文章」按钮
- `useFocusEffect`：每次页面获得焦点从 DB 重新加载

### Detail (`app/article/[id].tsx`)

- **WebView 渲染**：标题、摘要、正文、操作按钮全部内嵌在 HTML 中
- WebView 自己处理滚动，CSS 加了 `-webkit-overflow-scrolling: touch` 和硬件加速
- 操作按钮通过 `postMessage` 与 RN 通信（"打开原文" / "删除"）
- 处理中状态每 2 秒轮询 DB 更新

### Share Extension

- `expo-share-intent` 处理原生 UI
- `ShareViewController.swift` 先调 `completeRequest` 解除扩展（避免微信卡死），再打开 host app

---

## 9. Error handling

- **`js_content` 缺失** → `error`，"该文章需要在微信内打开"
- **HTTP non-200** → `error`，`"抓取失败 (HTTP {status})"`
- **火山方舟 API 失败** → `error`，"摘要生成失败，正文已保存"（body 仍然保存）
- **批量删除**：store 提供 `removeFailedArticles()` 一键清除所有失败文章

---

## 10. 已知问题与改进方向

- **JSON Parse error**：expo-share-intent 第一个 onChange 事件的 JSON 被截断，但第二个事件正确解析，功能不受影响
- **Turndown HTML→Markdown**：turndown 依赖标准 DOM API，在 RN 中适配困难。当前方案是 strip tags 后传纯文本给 LLM
- **WebView 性能**：微信文章 HTML 较大（100-200KB），可能有滑动卡顿

---

## 11. 近期变更（2026-05）

- 项目从 `WeChatClipper` 完整更名为 `Clipper`
- iOS 工程名、bundle id、scheme、app group 已切换至 `clipper` 命名
- 文章详情页滚动性能做了参数与渲染层优化
- “打开原文”从直接浏览器改为优先尝试唤起微信
- App 图标已去除外层白边视觉

## 12. 真机数据分析方案

采用“App 内导出 + Mac 端分析”模式：

1. iOS 端：`app/storage.tsx` 提供“导出并分享 JSON”
2. Mac 端：`scripts/analyze.js` 读取导出的 JSON 快照并输出统计

命令：

```bash
pnpm analyze /path/to/clipper-snapshot.json
```

说明：
- 此方案可直接用于真机。
- 不依赖 Simulator 的沙盒目录访问能力。
