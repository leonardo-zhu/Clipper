import { insertArticle, updateArticle, getArticle } from '@/src/db/queries';
import { scrapeWxArticle } from './scraper';
import { generateSummary } from './summarise';
import { useArticlesStore } from '@/src/store/articles';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function notify() {
  useArticlesStore.getState().loadArticles();
}

export function processUrl(url: string) {
  const id = uuid();
  insertArticle({ id, url, status: 'pending', created_at: Date.now() });
  notify();
  runNext(id);
}

async function runNext(id: string) {
  try {
    updateArticle(id, { status: 'fetching' });
    notify();
    const { title, body, source } = await scrapeWxArticle(getArticle(id)!.url);
    updateArticle(id, { title, body, source, status: 'summarising' });
    notify();

    try {
      const summary = await generateSummary(body);
      updateArticle(id, { summary, status: 'done' });
      notify();
    } catch {
      updateArticle(id, { summary: '摘要生成失败，正文已保存', status: 'error' });
      notify();
    }
  } catch (e: any) {
    const msg = e.message ?? '未知错误';
    if (msg.includes('HTTP')) {
      updateArticle(id, { status: 'error', summary: `抓取失败 (${msg})` });
    } else {
      updateArticle(id, { status: 'error', summary: msg });
    }
    notify();
  }
}
