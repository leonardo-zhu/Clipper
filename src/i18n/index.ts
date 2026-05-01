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
