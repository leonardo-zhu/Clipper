import { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useArticlesStore } from '@/src/store/articles';
import { t } from '@/src/i18n';
import { fontFamily } from '@/src/theme/typography';

type Phase = 'extracting' | 'summarising' | 'done' | 'error';

function phaseFromStatus(status?: string): Phase {
  if (status === 'done') return 'done';
  if (status === 'error') return 'error';
  if (status === 'summarising') return 'summarising';
  return 'extracting';
}

export default function IngestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { loadArticles } = useArticlesStore();
  const articles = useArticlesStore((state) => state.articles);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const article = useMemo(() => {
    if (!id) return null;
    return articles.find((item) => item.id === id) ?? null;
  }, [articles, id]);

  const phase = useMemo(() => phaseFromStatus(article?.status), [article?.status]);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    if (phase === 'done') {
      const timer = setTimeout(() => {
        router.replace('/');
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, router]);

  const ui = useMemo(() => {
    if (phase === 'summarising') {
      const p = Math.max(60, Math.min(99, article?.summarising_progress ?? 60));
      return {
        heroIcon: 'sync' as const,
        heroLabel: t('ingestion.syncingProgress'),
        heroTitle: t('ingestion.heroSummarizing'),
        cardTitle: t('ingestion.sourceDetected'),
        cardSub: article?.description ?? t('ingestion.placeholderDescription'),
        progress: p,
        statusLine: t('ingestion.summaryStatusLine'),
      };
    }

    if (phase === 'done') {
      return {
        heroIcon: 'sparkles' as const,
        heroLabel: t('ingestion.syncingProgress'),
        heroTitle: t('ingestion.heroSummarizing'),
        cardTitle: t('ingestion.sourceDetected'),
        cardSub: article?.description ?? t('ingestion.placeholderDescription'),
        progress: 100,
        statusLine: t('ingestion.summaryStatusLine'),
      };
    }

    if (phase === 'error') {
      return {
        heroIcon: 'alert-circle' as const,
        heroLabel: t('ingestion.syncingProgress'),
        heroTitle: t('ingestion.heroSummarizing'),
        cardTitle: t('article.errorTitle'),
        cardSub: article?.summary ?? t('common.unknownError'),
        progress: 100,
        statusLine: t('article.errorTitle'),
      };
    }

    return {
      heroIcon: 'sync' as const,
      heroLabel: t('ingestion.syncingProgress'),
      heroTitle: t('ingestion.title'),
      cardTitle: t('ingestion.sourceDetected'),
      cardSub: t('ingestion.sub'),
      progress: 36,
      statusLine: t('status.ingesting'),
    };
  }, [phase, article]);

  const showSkeleton = phase === 'extracting';
  const fallbackBg = require('../../assets/images/ingestion-bg.jpg');
  const ringSpin = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Image
        source={article?.msg_cdn_url ? { uri: article.msg_cdn_url } : fallbackBg}
        style={styles.bgImage}
        resizeMode="cover"
        blurRadius={32}
      />
      <View style={styles.sheet}>
        <View style={styles.topHeader}>
          <Text style={styles.brand}>Clipper</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <View style={styles.ringTrack} />
            <Animated.View style={[styles.ringSpin, { transform: [{ rotate: ringSpin }] }]} />
            <View style={styles.iconPlate}>
              <Ionicons name="sparkles" size={36} color="#456f62" />
            </View>
          </View>
          <Text style={styles.heroLabel}>{ui.heroLabel}</Text>
          <Text style={styles.heroTitle}>{ui.heroTitle}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.sourceBadge}><Text style={styles.sourceBadgeText}>{t('home.sourceFallback')}</Text></View>
            <Text style={styles.cardHeadText}>{ui.cardTitle}</Text>
            <Text style={styles.percentText}>{`${phase === 'extracting' ? ui.progress : 100}%`}</Text>
          </View>

          {showSkeleton ? (
            <>
              <View style={styles.skeletonLg} />
              <View style={styles.skeletonMd} />
              <View style={styles.skeletonSm} />
            </>
          ) : (
            <>
              <Text style={styles.realTitle} numberOfLines={2}>{article?.title ?? t('ingestion.placeholderTitle')}</Text>
              <Text style={styles.realDesc} numberOfLines={3}>{ui.cardSub}</Text>
            </>
          )}

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${phase === 'extracting' ? ui.progress : 100}%` }]}>
              <View style={styles.progressGlow} />
            </View>
          </View>

          <View style={styles.statusRow}>
            <Ionicons
              name={phase === 'error' ? 'alert-circle-outline' : 'sparkles'}
              size={18}
              color={phase === 'error' ? '#dc2626' : '#45655b'}
            />
            <Text style={styles.statusText}>{ui.statusLine}</Text>
          </View>

          {(phase === 'summarising' || phase === 'error') ? (
            <TouchableOpacity style={styles.cta} onPress={() => router.replace('/')}>
              <Text style={styles.ctaText}>{t('ingestion.moveToHome')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.bottomSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9faf7' },
  bgImage: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0.3,
    transform: [{ scale: 1.1 }],
  },
  sheet: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    paddingBottom: 14,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  topHeader: {
    width: '100%',
    height: 112,
    paddingBottom: 18,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  brand: { fontSize: 32, color: '#1f3f37', fontFamily: fontFamily.serif },
  hero: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    minHeight: 332,
    paddingTop: 40,
    paddingBottom: 38,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(199,234,222,0.15)',
  },
  heroIconWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  ringTrack: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#cad8d2',
  },
  ringSpin: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#45655b',
    borderTopColor: 'transparent',
    borderBottomColor: '#6f9085',
  },
  iconPlate: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#f7f9f8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#12211b',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  heroLabel: { fontSize: 11, letterSpacing: 2.2, color: '#3f6a5d', fontFamily: fontFamily.mono },
  heroTitle: {
    marginTop: 8,
    fontSize: 30,
    textAlign: 'center',
    color: '#1a1c1b',
    fontFamily: fontFamily.serif,
    lineHeight: 36,
  },
  card: {
    width: '88%',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 28,
    gap: 16,
    marginTop: -16,
    shadowColor: '#13211b',
    shadowOpacity: 0.16,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sourceBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#e4e7e5',
  },
  sourceBadgeText: { color: '#3f6a5d', fontSize: 11, fontFamily: fontFamily.mono, textTransform: 'uppercase' },
  cardHeadText: { flex: 1, color: '#9da1a5', fontSize: 13, fontFamily: fontFamily.sans },
  percentText: { color: '#3f6a5d', fontSize: 12, letterSpacing: 0.5, fontFamily: fontFamily.mono },
  skeletonLg: { height: 26, borderRadius: 10, backgroundColor: '#f1f3f2' },
  skeletonMd: { height: 20, borderRadius: 10, backgroundColor: '#f1f3f2', width: '88%' },
  skeletonSm: { height: 16, borderRadius: 8, backgroundColor: '#f1f3f2', width: '68%' },
  realTitle: { fontSize: 24, lineHeight: 31, color: '#1a1c1b', fontFamily: fontFamily.serif },
  realDesc: { fontSize: 13, lineHeight: 20, color: '#666e77', fontFamily: fontFamily.sans },
  progressTrack: { width: '100%', height: 3, backgroundColor: '#d3ddd8', borderRadius: 999, overflow: 'hidden' },
  progressFill: {
    height: '100%',
    backgroundColor: '#4b6c60',
    borderRadius: 999,
    position: 'relative',
    overflow: 'hidden',
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '45%',
    height: '100%',
    backgroundColor: '#c7eade',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { color: '#45655b', fontSize: 14, lineHeight: 22, flex: 1, fontFamily: fontFamily.sans },
  cta: {
    marginTop: 2,
    backgroundColor: '#000',
    borderRadius: 9999,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: { color: '#fff', textAlign: 'center', fontFamily: fontFamily.sansMedium, fontSize: 18 },
  bottomSpacer: { flex: 1, width: '100%' },
});
