import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useArticlesStore } from '@/src/store/articles';
import { t } from '@/src/i18n';
import { fontFamily } from '@/src/theme/typography';

export default function IngestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refreshArticle } = useArticlesStore();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 1200);
    return () => clearInterval(timer);
  }, []);

  const article = useMemo(() => (id ? refreshArticle(id) : null), [id, refreshArticle, tick]);
  const canMoveHome = article?.status === 'ingested' || article?.status === 'summarising' || article?.status === 'done';

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Clipper</Text>
      <View style={styles.spinnerWrap}>
        <ActivityIndicator size="large" color="#305e51" />
      </View>
      <Text style={styles.title}>{t('ingestion.title')}</Text>
      <Text style={styles.sub}>We are fetching title, description and cover metadata from WeChat.</Text>

      <View style={styles.card}>
        {article?.msg_cdn_url ? <Image source={{ uri: article.msg_cdn_url }} style={styles.cover} /> : <View style={styles.coverPlaceholder} />}
        <Text style={styles.articleTitle}>{article?.title ?? 'Ingesting article...'}</Text>
        <Text style={styles.description}>{article?.description ?? 'Description will appear here after the first crawl pass.'}</Text>
        {article?.status === 'summarising' ? (
          <View style={styles.progressWrap}>
            <Text style={styles.progressLabel}>AI generation summary is running</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, article.summarising_progress ?? 0))}%` }]} />
            </View>
          </View>
        ) : null}
      </View>

      {canMoveHome ? (
        <TouchableOpacity style={styles.cta} onPress={() => router.replace('/')}>
          <Text style={styles.ctaText}>{t('ingestion.moveToHome')}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.note}>{article?.status === 'summarising' ? 'AI generation summary is running' : t('status.ingesting')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f4', paddingHorizontal: 20, paddingTop: 80, alignItems: 'center' },
  brand: { fontSize: 30, color: '#0f3b31', marginBottom: 10, fontFamily: fontFamily.serif },
  spinnerWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f0ec',
    marginBottom: 8,
  },
  title: { marginTop: 10, fontSize: 24, textAlign: 'center', color: '#101815', marginBottom: 8, fontFamily: fontFamily.serif },
  sub: { fontSize: 13, color: '#5b6d66', textAlign: 'center', fontFamily: fontFamily.chinese, lineHeight: 20, maxWidth: 320 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#dbe4df', padding: 14, gap: 10, marginTop: 18 },
  cover: { width: '100%', height: 190, borderRadius: 14, backgroundColor: '#e9eeea' },
  coverPlaceholder: { width: '100%', height: 190, borderRadius: 14, backgroundColor: '#e9eeea' },
  articleTitle: { fontSize: 20, color: '#101815', fontFamily: fontFamily.serif },
  description: { fontSize: 16, color: '#45474a', lineHeight: 24, fontFamily: fontFamily.chinese },
  progressWrap: { marginTop: 4, gap: 8 },
  progressLabel: { color: '#476a5f', fontSize: 12, fontFamily: fontFamily.mono, letterSpacing: 0.4 },
  progressTrack: { width: '100%', height: 5, backgroundColor: '#dae6df', borderRadius: 999 },
  progressFill: { height: '100%', backgroundColor: '#46655b', borderRadius: 999 },
  cta: { marginTop: 22, backgroundColor: '#0f3b31', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, width: '100%' },
  ctaText: { color: '#fff', textAlign: 'center', fontFamily: fontFamily.sansMedium, fontSize: 16 },
  note: { marginTop: 22, color: '#476a5f', fontSize: 13, fontFamily: fontFamily.mono, letterSpacing: 0.4 },
});
