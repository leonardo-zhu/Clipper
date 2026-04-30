import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useArticlesStore } from '@/src/store/articles';
import type { Article } from '@/src/db/schema';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refreshArticle, removeArticle } = useArticlesStore();
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    if (id) {
      const a = refreshArticle(id);
      setArticle(a);
    }
  }, [id, refreshArticle]);

  useEffect(() => {
    if (!article || article.status === 'done' || article.status === 'error') return;
    const timer = setInterval(() => {
      if (id) {
        const updated = refreshArticle(id);
        if (updated) setArticle(updated);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [article, id, refreshArticle]);

  const openInWeChatFirst = useCallback(async (url: string) => {
    const candidates = [url, 'weixin://'];
    for (const target of candidates) {
      try {
        await Linking.openURL(target);
        return;
      } catch {
        continue;
      }
    }
    Alert.alert('无法打开链接');
  }, []);

  const summaryBlock = article?.status === 'done' && article.summary
    ? `<section class="panel panel-summary">
        <div class="panel-title">AI 摘要</div>
        <div class="panel-content">${article.summary}</div>
      </section>`
    : '';

  const errorBlock = article?.status === 'error'
    ? `<section class="panel panel-error">
        <div class="panel-title">处理失败</div>
        <div class="panel-content">${article.summary ?? '未知错误'}</div>
      </section>`
    : '';

  const statusBlock = article && (article.status === 'pending' || article.status === 'fetching' || article.status === 'summarising')
    ? `<section class="panel panel-status">
        <div class="panel-title">处理中</div>
        <div class="panel-content">
          ${article.status === 'fetching' ? '正在抓取文章...' : ''}
          ${article.status === 'summarising' ? '正在生成摘要...' : ''}
          ${article.status === 'pending' ? '等待处理...' : ''}
        </div>
      </section>`
    : '';

  const htmlContent = useMemo(() => {
    if (!article) {
      return `<!DOCTYPE html><html><body style="display:flex;justify-content:center;align-items:center;height:100vh;color:#999;font-size:16px;">加载中...</body></html>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  :root {
    --bg: #ffffff;
    --card: #ffffff;
    --text: #111827;
    --line: #e5e7eb;
    --brand: #2563eb;
    --brand-soft: #f8fafc;
    --error: #dc2626;
    --warn: #d97706;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; -webkit-overflow-scrolling: touch; background: var(--bg); }
  body {
    padding: 0 0 24px;
    -webkit-text-size-adjust: none;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  img { max-width: 100%; height: auto; border-radius: 3px; }
  .title-wrap { padding: 16px 16px 0; }
  .title { font-size: 22px; font-weight: 700; line-height: 1.45; margin: 0; color: #111827; }
  .meta {
    margin-top: 10px;
    font-size: 13px;
    color: #9ca3af;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .main { padding: 14px 16px 0; display: grid; gap: 12px; }
  .panel {
    border-radius: 10px;
    padding: 12px;
    border: 1px solid var(--line);
    background: var(--card);
  }
  .panel-title {
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 6px;
    letter-spacing: 0.2px;
  }
  .panel-content {
    font-size: 16px;
    line-height: 1.75;
    color: #1e293b;
  }
  .panel-summary { background: #f8fafc; }
  .panel-summary .panel-title { color: var(--brand); }
  .panel-error { border-color: #fecaca; background: #fef2f2; }
  .panel-error .panel-title, .panel-error .panel-content { color: var(--error); }
  .panel-status { border-color: #fde68a; background: #fffbeb; }
  .panel-status .panel-title, .panel-status .panel-content { color: var(--warn); }
  .article-card {
    border-radius: 0;
    padding: 0;
    border: none;
    background: #fff;
    overflow: hidden;
  }
  .article-card .app-body { transform: translateZ(0); backface-visibility: hidden; }
  .article-card .app-body * { max-width: 100% !important; }
  .actions {
    position: sticky;
    bottom: 10px;
    margin: 10px 14px 0;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 10px;
    display: flex;
    gap: 10px;
  }
  .btn {
    flex: 1;
    border: none;
    border-radius: 10px;
    padding: 12px;
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
  .btn-open { background: var(--brand); color: #fff; }
  .btn-delete { background: #fff; color: #dc2626; border: 1px solid #fecaca; }
</style>
</head>
<body>
  <header class="title-wrap">
    <h1 class="title">${article.title ?? '抓取中...'}</h1>
    <div class="meta">
      ${article.source ? `<span>${article.source}</span>` : ''}
      <span>${new Date(article.created_at).toLocaleString('zh-CN')}</span>
    </div>
  </header>

  <main class="main">
    ${summaryBlock}
    ${errorBlock}
    ${statusBlock}
    ${article.body ? `<section class="article-card"><div class="app-body">${article.body}</div></section>` : ''}
  </main>

  <footer class="actions">
    <button class="btn btn-open" onclick="window.ReactNativeWebView.postMessage('open')">打开原文</button>
    <button class="btn btn-delete" onclick="window.ReactNativeWebView.postMessage('delete')">删除文章</button>
  </footer>
</body>
</html>`;
  }, [article, summaryBlock, errorBlock, statusBlock]);

  const handleWebViewMessage = useCallback((event: any) => {
    if (!article) return;
    const action = event.nativeEvent.data;
    if (action === 'open' && article.url) {
      openInWeChatFirst(article.url);
    } else if (action === 'delete') {
      Alert.alert('确认删除', '删除后无法恢复', [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => removeArticle(article.id),
        },
      ]);
    }
  }, [article, openInWeChatFirst, removeArticle]);

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f7ff' },
  webview: { flex: 1, backgroundColor: '#f3f7ff' },
});
