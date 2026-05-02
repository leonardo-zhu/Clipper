import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useArticlesStore } from '@/src/store/articles';
import type { Article } from '@/src/db/schema';
import { t, tf } from '@/src/i18n';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const statusText = useMemo(() => {
    if (!article) return null;
    if (article.status === 'ingesting') return t('article.processingIngesting');
    if (article.status === 'summarising') return t('article.processingSummarising');
    if (article.status === 'queued') return t('article.processingQueued');
    if (article.status === 'ingested') return t('article.processingIngested');
    return null;
  }, [article]);

  const readMinutes = useMemo(() => {
    if (!article) return 1;
    return Math.max(
      1,
      Math.ceil(((article.body ?? article.summary ?? article.description ?? '').replace(/<[^>]+>/g, '').length || 600) / 380),
    );
  }, [article]);

  const parsedSummary = useMemo(() => {
    const raw = article?.summary?.trim() ?? '';
    if (!raw) return { lead: '', bullets: [] as string[] };

    const marker = 'KEY TAKEAWAYS';
    const idx = raw.indexOf(marker);
    if (idx < 0) return { lead: raw, bullets: [] as string[] };

    const lead = raw.slice(0, idx).trim();
    const tail = raw.slice(idx + marker.length);
    const bullets = tail
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('• '))
      .map((line) => line.replace(/^•\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    return { lead: lead || raw, bullets };
  }, [article?.summary]);

  if (!article) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>{t('article.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: 20 + 76 + insets.bottom,
          },
        ]}
      >

        <View style={styles.titleWrap}>
          <Text style={styles.kicker}>{t('article.kicker')}</Text>
          <Text style={styles.title}>{article.title ?? t('article.titlePending')}</Text>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={17} color="#4b5563" />
              <Text style={styles.metaText}>{new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={17} color="#4b5563" />
              <Text style={styles.metaText}>{tf('home.minRead', { count: readMinutes })}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="apps-outline" size={17} color="#35584d" />
              <Text style={styles.metaCategory}>{article.source || t('article.defaultCategory')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.main}>
          {article.msg_cdn_url ? <Image source={{ uri: article.msg_cdn_url }} style={styles.cover} resizeMode="cover" /> : null}

          {article.status === 'done' && article.summary ? (
            <View style={[styles.panel, styles.panelSummary]}>
              <View style={styles.summaryHead}>
                <View style={styles.summaryTitleWrap}>
                  <Ionicons name="sparkles" size={18} color="#35584d" />
                  <Text style={styles.panelSummaryTitle}>{t('article.summaryTitle')}</Text>
                </View>
                <Ionicons name="sparkles" size={48} color="rgba(95, 99, 104, 0.22)" />
              </View>
              <Text style={styles.summaryLead}>{parsedSummary.lead}</Text>
              {parsedSummary.bullets.length > 0 ? (
                <>
                  <Text style={styles.summaryKicker}>{t('article.keyTakeaways')}</Text>
                  <View style={styles.summaryList}>
                    {parsedSummary.bullets.map((item, index) => (
                      <View key={`${index}-${item}`} style={styles.summaryItem}>
                        <Ionicons name="ellipse" size={8} color="#35584d" style={styles.summaryBulletIcon} />
                        <Text style={styles.summaryItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {article.status === 'error' ? (
            <View style={[styles.panel, styles.panelError]}>
              <Text style={[styles.panelTitle, styles.errorText]}>{t('article.errorTitle')}</Text>
              <Text style={[styles.panelContent, styles.errorText]}>{article.summary ?? t('common.unknownError')}</Text>
            </View>
          ) : null}

          {statusText ? (
            <View style={[styles.panel, styles.panelStatus]}>
              <Text style={[styles.panelTitle, styles.statusText]}>{t('article.processingTitle')}</Text>
              <Text style={[styles.panelContent, styles.statusText]}>{statusText}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(10, insets.bottom + 8) }]}>
        <Pressable
          style={styles.readButton}
          onPress={() => router.push(`/article/${article.id}/reader`)}
        >
          <Text style={styles.readButtonText}>{t('article.readOriginal')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9faf7' },
  scroll: { flex: 1 },
  content: { paddingBottom: 20 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9faf7' },
  loadingText: { fontSize: 16, color: '#687076', fontFamily: 'Sora_400Regular' },
  titleWrap: { paddingHorizontal: 20, paddingTop: 20 },
  kicker: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 11,
    letterSpacing: 1,
    color: '#35584d',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 24,
    lineHeight: 31,
    color: '#1a1c1b',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: { fontSize: 13, color: '#4b5563', fontFamily: 'Sora_400Regular' },
  metaCategory: { fontSize: 13, color: '#35584d', fontFamily: 'Sora_600SemiBold' },
  main: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  cover: { width: '100%', aspectRatio: 1280 / 544, borderRadius: 12, backgroundColor: '#e5e7eb' },
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.74)',
  },
  panelTitle: { fontFamily: 'DMMono_500Medium', fontSize: 11, marginBottom: 6, letterSpacing: 0.2 },
  panelContent: { fontFamily: 'Sora_400Regular', fontSize: 14, lineHeight: 22 },
  panelSummary: { backgroundColor: '#f8fafc' },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelSummaryTitle: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: '#1f3f37' },
  summaryLead: { marginTop: 8, fontFamily: 'Sora_400Regular', fontSize: 15, lineHeight: 24, color: '#4b5563' },
  summaryKicker: {
    marginTop: 14,
    fontFamily: 'DMMono_500Medium',
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#5d7a72',
  },
  summaryList: { marginTop: 8, gap: 10 },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryBulletIcon: {
    marginTop: 8,
  },
  summaryItemText: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: '#1f2937',
  },
  panelError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  errorText: { color: '#dc2626' },
  panelStatus: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  statusText: { color: '#d97706' },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  readButton: {
    backgroundColor: '#456f64',
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readButtonText: { color: '#fff', fontFamily: 'Sora_600SemiBold', fontSize: 16 },
});
