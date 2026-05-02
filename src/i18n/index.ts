import { getLocales } from 'expo-localization';

type Locale = 'zh-CN' | 'en-US';

const messages: Record<Locale, Record<string, string>> = {
  'zh-CN': {
    'app.loading': '加载中...',
    'status.queued': '等待处理',
    'status.ingesting': '正在抓取微信内容',
    'status.ingested': '抓取完成',
    'status.summarising': 'AI 正在生成摘要',
    'status.done': '已摘要',
    'status.error': '失败',
    'home.aiSummaryInProgress': 'AI generation summary 正在进行中',
    'ingestion.title': 'Extracting content from WeChat...',
    'ingestion.done': '内容抓取完成',
    'ingestion.moveToHome': 'Move to Home & Summarize',
    'nav.library': 'Library',
    'nav.storage': 'Storage',
    'home.emptyTitle': '你的文章库还是空的',
    'home.emptyHint': '从微信分享一篇文章，或导入历史快照开始使用。',
    'home.addFirst': '添加第一篇文章',
    'home.addContent': '添加内容',
    'home.chooseImport': '选择导入方式',
    'home.pasteWechatUrl': '粘贴微信链接',
    'home.importSnapshot': '导入 Snapshot JSON',
    'home.importing': '导入中...',
    'home.startCrawl': '开始抓取',
    'home.cancel': '取消',
    'alert.invalidLinkTitle': '链接无效',
    'alert.invalidLinkMessage': '请粘贴完整的 http(s) 链接',
    'alert.importDoneTitle': '导入完成',
    'alert.importFailTitle': '导入失败',
    'article.tags': '标签',
    'article.addTag': '添加标签',
    'article.add': '添加',
    'article.quickAdd': '快速添加',
  },
  'en-US': {
    'app.loading': 'Loading...',
    'status.queued': 'Queued',
    'status.ingesting': 'Extracting from WeChat',
    'status.ingested': 'Extracted',
    'status.summarising': 'AI generating summary',
    'status.done': 'Done',
    'status.error': 'Error',
    'home.aiSummaryInProgress': 'AI generation summary in progress',
    'ingestion.title': 'Extracting content from WeChat...',
    'ingestion.done': 'Content extraction complete',
    'ingestion.moveToHome': 'Move to Home & Summarize',
    'nav.library': 'Library',
    'nav.storage': 'Storage',
    'home.emptyTitle': 'Your library is empty',
    'home.emptyHint': 'Start by sharing from WeChat, or import an exported snapshot file.',
    'home.addFirst': 'Add Your First Article',
    'home.addContent': 'Add Content',
    'home.chooseImport': 'Choose Import Method',
    'home.pasteWechatUrl': 'Paste WeChat URL',
    'home.importSnapshot': 'Import Snapshot JSON',
    'home.importing': 'Importing...',
    'home.startCrawl': 'Start Crawling',
    'home.cancel': 'Cancel',
    'alert.invalidLinkTitle': 'Invalid URL',
    'alert.invalidLinkMessage': 'Please paste a full http(s) URL',
    'alert.importDoneTitle': 'Import Completed',
    'alert.importFailTitle': 'Import Failed',
    'article.tags': 'Tags',
    'article.addTag': 'Add Tag',
    'article.add': 'Add',
    'article.quickAdd': 'Quick Add',
  },
};

function detectLocale(): Locale {
  const tag = getLocales()[0]?.languageTag ?? 'zh-CN';
  return tag.startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function t(key: string): string {
  const locale = detectLocale();
  return messages[locale][key] ?? messages['zh-CN'][key] ?? key;
}
