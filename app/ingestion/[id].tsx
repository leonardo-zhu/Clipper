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
      <ActivityIndicator size="large" color="#45655b" />
      <Text style={styles.title}>{t('ingestion.title')}</Text>

      <View style={styles.card}>
        {article?.msg_cdn_url ? <Image source={{ uri: article.msg_cdn_url }} style={styles.cover} /> : null}
        <Text style={styles.articleTitle}>{article?.title ?? '...'}</Text>
        <Text style={styles.description}>{article?.description ?? '...'}</Text>
      </View>

      {canMoveHome ? (
        <TouchableOpacity style={styles.cta} onPress={() => router.replace('/')}>
          <Text style={styles.ctaText}>{t('ingestion.moveToHome')}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.note}>{t('status.ingesting')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9faf7', paddingHorizontal: 20, paddingTop: 80, alignItems: 'center' },
  brand: { fontSize: 30, color: '#45655b', marginBottom: 18, fontFamily: fontFamily.serif },
  title: { marginTop: 20, fontSize: 22, textAlign: 'center', color: '#1a1c1b', marginBottom: 24, fontFamily: fontFamily.serif },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, gap: 10 },
  cover: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#edeeeb' },
  articleTitle: { fontSize: 20, color: '#1a1c1b', fontFamily: fontFamily.serif },
  description: { fontSize: 16, color: '#45474a', lineHeight: 24, fontFamily: fontFamily.chinese },
  cta: { marginTop: 24, backgroundColor: '#000', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, width: '100%' },
  ctaText: { color: '#fff', textAlign: 'center', fontFamily: fontFamily.sansMedium, fontSize: 16 },
  note: { marginTop: 24, color: '#45655b', fontSize: 14, fontFamily: fontFamily.mono, letterSpacing: 0.4 },
});
