import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, Alert, Modal, Pressable, TextInput, Platform, ToastAndroid, Animated, Easing } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useArticlesStore } from '@/src/store/articles';
import type { Article } from '@/src/db/schema';
import { t, tf } from '@/src/i18n';
import { processUrl } from '@/src/lib/queue';
import { AppIcon } from '@/src/components/AppIcon';
import { fontFamily } from '@/src/theme/typography';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { getArticleByUrl, insertArticle, updateArticle } from '@/src/db/queries';
import { BASE_TAGS, getTagLabel, isBaseTag, parseTags, splitTags, topPrimaryTags } from '@/src/lib/tags';
import { normalizeImportRow, resolveImportId } from '@/src/lib/importer';
import * as Clipboard from 'expo-clipboard';
import { getRelativeTimeToken } from '@/src/lib/time';
import { extractWeChatArticleUrl } from '@/src/lib/wx-url';

function HomeCard({ item, onPress }: { item: Article; onPress: () => void }) {
  const isSummarising = item.status === 'summarising';
  const progress = Math.max(0, Math.min(100, item.summarising_progress ?? 0));
  const shimmer = useRef(new Animated.Value(0)).current;
  const tags = parseTags(item.tags_json);
  const { base, ai } = splitTags(tags);
  const source = item.source || item.profile_signature || t('home.sourceFallback');
  const sourceHasChinese = /[\u4e00-\u9fff]/.test(source);
  const imageUri = item.msg_cdn_url || item.cover_url_1_1 || '';
  const timestamp = item.ingested_at ?? item.created_at;
  const timeToken = getRelativeTimeToken(timestamp);
  const timeLabel = 'params' in timeToken ? tf(timeToken.key, timeToken.params) : t(timeToken.key);
  const bodyPlainTextLength = (item.body ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
  const descriptionLength = (item.description ?? '').replace(/\s+/g, '').length;
  const estimatedTextLength = bodyPlainTextLength || descriptionLength || 600;
  const WECHAT_CHARS_PER_MINUTE = 380;
  const readMinutes = Math.max(1, Math.ceil(estimatedTextLength / WECHAT_CHARS_PER_MINUTE));
  const shimmerLeft = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['-18%', '100%'],
  });

  useEffect(() => {
    if (!isSummarising) return;
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    shimmer.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [isSummarising, shimmer]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.content}>
        {isSummarising ? (
          <View style={styles.progressTopWrap}>
            <View style={styles.progressTopTrack}>
              <View style={[styles.progressTopFill, { width: `${progress}%` }]} />
              <Animated.View style={[styles.progressTopShimmer, { left: shimmerLeft }]} />
            </View>
            <View style={styles.progressTopMeta}>
              <Text style={styles.progressTopLabel}>{t('home.aiSummaryInProgress')}</Text>
              <Text style={styles.progressTopTime}>{timeLabel.toUpperCase()}</Text>
            </View>
          </View>
        ) : null}
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.cover} resizeMode="cover" /> : <View style={styles.coverPlaceholder} />}
        <View style={styles.cardMetaRow}>
          <Text style={[styles.cardSource, sourceHasChinese ? styles.cardSourceChinese : styles.cardSourceMono]} numberOfLines={1}>{source}</Text>
          <Text style={styles.cardTime}>{timeLabel}</Text>
        </View>
        <Text style={styles.title}>{item.title ?? t('home.untitled')}</Text>
        {!!item.description ? <Text style={styles.description}>{item.description}</Text> : null}
        {tags.length ? (
          <View style={styles.tagRow}>
            {base.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{getTagLabel(tag, t)}</Text>
              </View>
            ))}
            {ai.slice(0, 1).map((tag) => (
              <View key={tag} style={styles.tagPillAi}>
                <Text style={styles.tagTextAi}>{tag}</Text>
              </View>
            ))}
            <View style={styles.tagPillAi}>
              <Text style={styles.tagTextAi}>{tf('home.minRead', { count: readMinutes })}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { articles, loadArticles } = useArticlesStore();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [link, setLink] = useState('');
  const [importing, setImporting] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [loadArticles]),
  );

  const openAddMenu = useCallback(() => setShowAddSheet(true), []);
  const closeAddMenu = useCallback(() => {
    setShowAddSheet(false);
    setShowLinkInput(false);
    setLink('');
  }, []);

  const notify = useCallback((message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(t('common.notice'), message, [{ text: t('common.ok') }]);
    }
  }, []);

  const confirmLinkImport = useCallback(() => {
    const normalizedUrl = extractWeChatArticleUrl(link);
    if (!normalizedUrl) {
      Alert.alert(t('alert.invalidLinkTitle'), t('alert.invalidLinkMessage'));
      return;
    }
    const id = processUrl(normalizedUrl);
    closeAddMenu();
    router.push(`/ingestion/${id}`);
  }, [closeAddMenu, link, router]);

  const pasteAndImport = useCallback(async () => {
    try {
      const text = (await Clipboard.getStringAsync()).trim();
      if (!text) {
        notify(t('home.clipboardEmpty'));
        return;
      }
      const normalizedUrl = extractWeChatArticleUrl(text);
      if (!normalizedUrl) {
        notify(t('home.clipboardInvalid'));
        return;
      }
      const id = processUrl(normalizedUrl);
      closeAddMenu();
      router.push(`/ingestion/${id}`);
    } catch {
      notify(t('common.unknownError'));
    }
  }, [closeAddMenu, notify, router]);

  const importSnapshot = useCallback(async () => {
    try {
      setImporting(true);
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      if (!picked.assets?.length) throw new Error(t('common.unknownError'));

      const raw = await new File(picked.assets[0].uri).text();
      const payload = JSON.parse(raw) as { articles?: Partial<Article>[] };
      const rows = Array.isArray(payload.articles) ? payload.articles : [];

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of rows) {
        if (!row.url || typeof row.url !== 'string') {
          skipped++;
          continue;
        }
        const existed = getArticleByUrl(row.url);
        const patch = normalizeImportRow(row);

        if (existed) {
          updateArticle(existed.id, patch);
          updated++;
        } else {
          const id = resolveImportId(row);
          insertArticle({
            id,
            url: row.url,
            status: patch.status,
            created_at: typeof row.created_at === 'number' ? row.created_at : Date.now(),
          });
          updateArticle(id, patch);
          inserted++;
        }
      }

      loadArticles();
      closeAddMenu();
      Alert.alert(t('alert.importDoneTitle'), tf('home.importSummary', { inserted, updated, skipped }));
    } catch (err: any) {
      Alert.alert(t('alert.importFailTitle'), err?.message ?? t('common.unknownError'));
    } finally {
      setImporting(false);
    }
  }, [closeAddMenu, loadArticles]);

  const visibleArticles = articles.filter((article) => {
    const tagMatched = activeTag ? parseTags(article.tags_json).includes(activeTag) : true;
    if (!tagMatched) return false;
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return `${article.title ?? ''} ${article.description ?? ''}`.toLowerCase().includes(keyword);
  });

  const topGroups = useMemo(() => {
    const tagSets = articles.map((a) => parseTags(a.tags_json));
    return topPrimaryTags(tagSets, 3).filter((tag) => isBaseTag(tag));
  }, [articles]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Clipper</Text>
          <Text style={styles.headerSub}>{t('home.headerWorkspace')}</Text>
          <Text style={styles.headerMeta}>{tf('home.articlesCount', { count: articles.length })}</Text>
        </View>
        <View style={styles.searchWrap}>
          <AppIcon name="search" size={18} color="#9aa09d" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor="#9aa09d"
          />
        </View>
      </View>

      <View style={styles.tagStripWrap}>
        <FlatList
          horizontal
          data={[t('home.filterAll'), ...topGroups, ...BASE_TAGS.filter((tag) => !topGroups.includes(tag))]}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagStrip}
          ItemSeparatorComponent={() => <View style={styles.tagSeparator} />}
          renderItem={({ item }) => {
            const selected = item === t('home.filterAll') ? activeTag === null : activeTag === item;
            return (
              <TouchableOpacity
                style={[styles.filterChip, selected ? styles.filterChipActive : null]}
                onPress={() => setActiveTag(item === t('home.filterAll') ? null : item)}
              >
                <Text style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}>
                  {item === t('home.filterAll') ? item : getTagLabel(item, t)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={visibleArticles}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadArticles} tintColor="#325f53" />}
        contentContainerStyle={styles.list}
        bounces={visibleArticles.length > 0}
        alwaysBounceVertical={visibleArticles.length > 0}
        overScrollMode={visibleArticles.length > 0 ? 'always' : 'never'}
        scrollEnabled={visibleArticles.length > 0}
        renderItem={({ item }) => <HomeCard item={item} onPress={() => router.push(`/article/${item.id}`)} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="auto_stories" size={48} color="#709186" />
            </View>
            <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
            <Text style={styles.emptyHint}>{t('home.emptyHint')}</Text>
            <TouchableOpacity style={styles.emptyCta} onPress={openAddMenu} activeOpacity={0.9}>
              <View style={styles.emptyCtaInner}>
                <AppIcon name="add_circle" size={20} color="#ffffff" />
                <Text style={styles.emptyCtaText}>{t('home.addFirst')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        }
      />

      {visibleArticles.length > 0 ? (
        <TouchableOpacity style={styles.fab} onPress={openAddMenu} activeOpacity={0.9}>
          <AppIcon name="add" size={25} color="#fff" />
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={showAddSheet}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={closeAddMenu}
      >
        <Pressable style={styles.sheetMask} onPress={closeAddMenu}>
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('home.addContent')}</Text>
            <Text style={styles.sheetSub}>{t('home.chooseImport')}</Text>

            {showLinkInput ? null : (
              <>
                <TouchableOpacity style={styles.sheetAction} onPress={pasteAndImport}>
                  <View style={styles.sheetActionInner}>
                    <AppIcon name="bookmarks" size={18} color="#1f3f37" />
                    <Text style={styles.sheetActionText}>{t('home.pasteWechatUrl')}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetAction}
                  onPress={importSnapshot}
                  disabled={importing}
                >
                  <View style={styles.sheetActionInner}>
                    <AppIcon name="download" size={18} color="#1f3f37" />
                    <Text style={styles.sheetActionText}>{importing ? t('home.importing') : t('home.importSnapshot')}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.hintsGrid}>
                  <View style={styles.hintCard}>
                    <AppIcon name="summarize" size={18} color="#1f3f37" />
                    <Text style={styles.hintTitle}>{t('home.hintAiSummaryTitle')}</Text>
                    <Text style={styles.hintText}>{t('home.hintAiSummaryText')}</Text>
                  </View>
                  <View style={styles.hintCard}>
                    <AppIcon name="auto_read_pause" size={18} color="#1f3f37" />
                    <Text style={styles.hintTitle}>{t('home.hintPureReaderTitle')}</Text>
                    <Text style={styles.hintText}>{t('home.hintPureReaderText')}</Text>
                  </View>
                </View>

              </>
            )}

            <TouchableOpacity style={styles.sheetCancel} onPress={closeAddMenu}>
              <Text style={styles.sheetCancelText}>{t('home.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9faf7' },
  header: {
    paddingTop: 58,
    paddingBottom: 10,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 14,
  },
  brand: { fontSize: 32, color: '#1f3f37', fontFamily: fontFamily.serif, lineHeight: 38 },
  headerSub: { marginTop: 4, fontSize: 11, color: '#45655b', fontFamily: fontFamily.mono, letterSpacing: 1.2, lineHeight: 12 },
  headerMeta: { marginTop: 8, fontSize: 13, color: '#45474a', fontFamily: fontFamily.sans, lineHeight: 18 },
  searchWrap: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f1',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: fontFamily.sans, fontSize: 14, color: '#1a1c1b', paddingVertical: 0 },
  tagStripWrap: { paddingTop: 10, paddingBottom: 10 },
  tagStrip: { paddingHorizontal: 20, paddingRight: 24 },
  tagSeparator: { width: 8 },
  filterChip: {
    borderWidth: 0,
    backgroundColor: '#edeeeb',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: '#000000' },
  filterChipText: { fontSize: 13, color: '#45474a', fontFamily: fontFamily.sansMedium, textAlign: 'center', lineHeight: 18 },
  filterChipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 18, paddingBottom: 142 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#13211b',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  cover: { width: '100%', aspectRatio: 1280 / 544, borderRadius: 14, backgroundColor: '#e9eeea' },
  coverPlaceholder: { width: '100%', aspectRatio: 1280 / 544, backgroundColor: '#e9eeea', borderRadius: 14 },
  content: { padding: 16, gap: 10 },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    minHeight: 22,
  },
  cardSource: {
    fontSize: 12,
    lineHeight: 14,
    color: '#35584d',
    flexShrink: 1,
    paddingRight: 10,
  },
  cardSourceChinese: { fontFamily: fontFamily.chinese, letterSpacing: 0 },
  cardSourceMono: { fontFamily: fontFamily.mono, letterSpacing: 0.5 },
  cardTime: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 14, color: '#8f95a1', letterSpacing: 0.5 },
  title: { fontSize: 24, color: '#1a1c1b', fontFamily: fontFamily.serif, lineHeight: 31, marginTop: 4 },
  description: { fontSize: 13, color: '#45474a', lineHeight: 21, fontFamily: fontFamily.sans, marginTop: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tagPill: { backgroundColor: 'rgba(199,234,222,0.35)', borderRadius: 4, paddingHorizontal: 8, minHeight: 20, alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: 10, color: '#4b6b61', fontFamily: fontFamily.mono, textAlign: 'center', lineHeight: 10 },
  tagPillAi: { backgroundColor: '#edeeeb', borderRadius: 4, paddingHorizontal: 8, minHeight: 20, alignItems: 'center', justifyContent: 'center' },
  tagTextAi: { fontSize: 10, color: '#5e6062', fontFamily: fontFamily.mono, textAlign: 'center', lineHeight: 10 },
  progressTopWrap: { marginBottom: 8, gap: 8 },
  progressTopTrack: { width: '100%', height: 6, backgroundColor: '#dbe8e3', borderRadius: 999, overflow: 'hidden' },
  progressTopFill: { height: '100%', backgroundColor: '#46655b', borderRadius: 999 },
  progressTopShimmer: {
    position: 'absolute',
    top: 0,
    width: '18%',
    height: '100%',
    backgroundColor: 'rgba(173, 214, 199, 0.9)',
    borderRadius: 999,
  },
  progressTopMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTopLabel: { color: '#3f6a5d', fontSize: 11, fontFamily: fontFamily.mono, letterSpacing: 0.8 },
  progressTopTime: { color: '#8f95a1', fontSize: 11, fontFamily: fontFamily.mono, letterSpacing: 0.8 },
  emptyWrap: { flex: 1, minHeight: 520, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, gap: 16 },
  emptyIconCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    borderColor: '#d3ddd7',
    backgroundColor: '#eef3ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 2, fontSize: 28, color: '#141c19', fontFamily: fontFamily.serif },
  emptyHint: { fontSize: 13, lineHeight: 20, color: '#4a5853', textAlign: 'center', maxWidth: 360, fontFamily: fontFamily.sans },
  emptyCta: {
    marginTop: 8,
    backgroundColor: '#0f3b31',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyCtaInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyCtaText: { color: '#fff', fontFamily: fontFamily.sansMedium, fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#45655b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0e1f19',
    shadowOpacity: 0.19,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  sheetMask: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', padding: 0 },
  sheetCard: {
    backgroundColor: '#f9faf7',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 30,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 28, color: '#1f3f37', fontFamily: fontFamily.serif, lineHeight: 34 },
  sheetSub: { fontSize: 13, color: '#45474a', fontFamily: fontFamily.sans, marginTop: -4 },
  sheetAction: { backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 14, marginTop: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  sheetActionInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetActionText: { fontSize: 15, color: '#111827', fontFamily: fontFamily.sansMedium },
  sheetActionPrimary: { backgroundColor: '#1f3f37', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  sheetActionPrimaryText: { color: '#fff', fontSize: 15, fontFamily: fontFamily.sansMedium },
  hintsGrid: { flexDirection: 'row', gap: 10, marginTop: 4 },
  hintCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.045)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  hintTitle: { fontFamily: fontFamily.sansMedium, fontSize: 12, color: '#1f3f37' },
  hintText: { fontFamily: fontFamily.sans, fontSize: 11, color: '#6b7280', lineHeight: 15 },
  sheetCancel: { backgroundColor: '#e9efeb', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 2 },
  sheetCancelText: { color: '#111827', fontSize: 14, fontFamily: fontFamily.sansMedium },
});
