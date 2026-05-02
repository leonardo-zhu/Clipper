import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useArticlesStore } from '@/src/store/articles';
import type { Article } from '@/src/db/schema';
import { t } from '@/src/i18n';

export default function ArticleReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refreshArticle } = useArticlesStore();
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

  const htmlContent = useMemo(() => {
    if (!article) {
      return `<!DOCTYPE html><html><body style="display:flex;justify-content:center;align-items:center;height:100vh;color:#999;font-size:16px;">${t('article.loading')}</body></html>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    padding: 0 16px;
    -webkit-text-size-adjust: none;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  img, video, iframe { max-width: 100% !important; height: auto !important; }
  table { max-width: 100% !important; }
  .rich_media_content, .rich_media_content * { max-width: 100% !important; }
</style>
</head>
<body>
  ${article.body ?? ''}
</body>
</html>`;
  }, [article]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1, backgroundColor: '#fff' },
});
