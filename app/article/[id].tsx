import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking } from 'react-native';
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
  }, [id]);

  useEffect(() => {
    if (!article || article.status === 'done' || article.status === 'error') return;
    const timer = setInterval(() => {
      if (id) {
        const updated = refreshArticle(id);
        if (updated) setArticle(updated);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [article?.status]);

  const openInWeChatFirst = useCallback(async (url: string) => {
    const encoded = encodeURIComponent(url);
    const candidates = [
      `weixin://dl/businessWebview/link?url=${encoded}`,
      `weixin://dl/business/?ticket=${encoded}`,
      'weixin://',
      url,
    ];

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

  if (!article) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  const summaryBlock = article.status === 'done' && article.summary
    ? `<div style="background:#f3e8ff;border-left:4px solid #8b5cf6;padding:16px;border-radius:12px;margin:0 0 16px;">
        <div style="font-size:12px;font-weight:600;color:#7c3aed;margin-bottom:8px;">AI 摘要</div>
        <div style="font-size:15px;color:#333;line-height:1.6;">${article.summary}</div>
      </div>`
    : '';

  const errorBlock = article.status === 'error'
    ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:12px;margin:0 0 16px;">
        <div style="font-size:14px;color:#dc2626;">${article.summary ?? '未知错误'}</div>
      </div>`
    : '';

  const statusBlock = (article.status === 'pending' || article.status === 'fetching' || article.status === 'summarising')
    ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;border-radius:12px;margin:0 0 16px;">
        <div style="font-size:14px;color:#b45309;">
          ${article.status === 'fetching' ? '正在抓取文章...' : ''}
          ${article.status === 'summarising' ? '正在生成摘要...' : ''}
          ${article.status === 'pending' ? '等待处理...' : ''}
        </div>
      </div>`
    : '';

  const htmlContent = useMemo(() => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; -webkit-overflow-scrolling: touch; }
  body {
    padding: 16px;
    -webkit-text-size-adjust: none;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    background: #fff;
  }
  img { max-width: 100%; height: auto; }
  .app-body { transform: translateZ(0); backface-visibility: hidden; }
  .app-title { font-size: 22px; font-weight: 700; color: #1a1a1a; line-height: 1.4; margin-bottom: 8px; }
  .app-meta { font-size: 13px; color: #888; margin-bottom: 16px; display: flex; gap: 12px; }
  .app-actions { display: flex; gap: 12px; margin-top: 24px; padding-bottom: 40px; }
  .app-btn { flex: 1; padding: 14px; border-radius: 10px; text-align: center; font-size: 15px; font-weight: 600; cursor: pointer; border: none; }
  .app-btn-open { background: #3b82f6; color: #fff; }
  .app-btn-delete { background: #fff; color: #ef4444; border: 1px solid #e5e7eb; }
</style>
</head>
<body>
  <div class="app-title">${article.title ?? '抓取中...'}</div>
  <div class="app-meta">
    ${article.source ? `<span>${article.source}</span>` : ''}
    <span>${new Date(article.created_at).toLocaleDateString('zh-CN')}</span>
  </div>
  ${summaryBlock}
  ${errorBlock}
  ${statusBlock}
  ${article.body ? `<div class="app-body">${article.body}</div>` : ''}
  <div class="app-actions">
    <button class="app-btn app-btn-open" onclick="window.ReactNativeWebView.postMessage('open')">打开原文</button>
    <button class="app-btn app-btn-delete" onclick="window.ReactNativeWebView.postMessage('delete')">删除</button>
  </div>
</body>
</html>`, [
    article.body,
    article.created_at,
    article.source,
    article.status,
    article.summary,
    article.title,
  ]);

  const handleWebViewMessage = useCallback((event: any) => {
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
  }, [article.id, article.url, openInWeChatFirst, removeArticle]);

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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#999' },
  webview: { flex: 1, backgroundColor: '#fff' },
});
