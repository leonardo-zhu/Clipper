import { insertArticle, updateArticle, getArticle } from '@/src/db/queries';
import { scrapeWxArticle } from './scraper';
import { generateSummaryAndGrouping } from './summarise';
import { useArticlesStore } from '@/src/store/articles';
import { encodeTags, generateBaseTags, parseTags } from './tags';

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
  insertArticle({ id, url, status: 'queued', created_at: Date.now() });
  notify();
  runIngestion(id);
  return id;
}

async function runIngestion(id: string) {
  try {
    updateArticle(id, { status: 'ingesting', summarising_progress: 0 });
    notify();
    const current = getArticle(id);
    if (!current) throw new Error('任务不存在');

    const { title, description, body, source, profileSignature, msgCdnUrl, coverUrl1x1, lang } =
      await scrapeWxArticle(current.url);
    const baseTags = generateBaseTags({ title, description, source });

    updateArticle(id, {
      title,
      description,
      body,
      source,
      profile_signature: profileSignature,
      msg_cdn_url: msgCdnUrl,
      cover_url_1_1: coverUrl1x1,
      tags_json: encodeTags(baseTags),
      lang,
      status: 'ingested',
      ingested_at: Date.now(),
    });
    notify();
    void runSummarisation(id);
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

async function runSummarisation(id: string) {
  updateArticle(id, { status: 'summarising', summarising_progress: 20 });
  notify();

  try {
    const current = getArticle(id);
    if (!current?.body) throw new Error('正文为空，无法生成摘要');

    updateArticle(id, { summarising_progress: 55 });
    notify();

    const result = await generateSummaryAndGrouping(current.body);
    const existingTags = parseTags(current.tags_json);
    const nextTags = [result.primary_group, ...existingTags];

    updateArticle(id, {
      summary: result.summary,
      tags_json: encodeTags(nextTags),
      status: 'done',
      summarising_progress: 100,
    });
    notify();
  } catch (e: any) {
    updateArticle(id, { summary: e?.message ?? '摘要生成失败，正文已保存', status: 'error' });
    notify();
  }
}
