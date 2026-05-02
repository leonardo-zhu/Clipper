import { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { useArticlesStore } from '@/src/store/articles';
import type { Article } from '@/src/db/schema';
import { fontFamily } from '@/src/theme/typography';
import { getTagLabel, parseTags } from '@/src/lib/tags';
import { AppIcon } from '@/src/components/AppIcon';
import { t, tf } from '@/src/i18n';
import { getRelativeTimeToken } from '@/src/lib/time';

type CollectionStat = {
  name: string;
  icon: string;
  count: number;
  order: string;
};

function CollectionStatCard({ item }: { item: CollectionStat }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTopRow}>
        <AppIcon name={item.icon} size={20} color="#45655b" />
        <Text style={styles.statOrder}>{item.order}</Text>
      </View>
      <View>
        <Text style={styles.statName}>{item.name}</Text>
        <Text style={styles.statCount}>{tf('library.articlesCount', { count: item.count })}</Text>
      </View>
    </View>
  );
}

function ArticleRow({ item, onPress, onDelete }: { item: Article; onPress: () => void; onDelete: () => void }) {
  const tags = parseTags(item.tags_json);
  const chip = getTagLabel(tags[0] ?? t('library.defaultGeneral'), t);
  const ts = item.ingested_at ?? item.created_at;
  const timeToken = getRelativeTimeToken(ts);
  const time = 'params' in timeToken ? tf(timeToken.key, timeToken.params) : t(timeToken.key);
  const imageUri = item.cover_url_1_1 || item.msg_cdn_url || '';

  const swipeableRef = useRef<Swipeable | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const movedBySwipe = useRef(false);

  return (
    <View style={styles.rowWrap}>
      <Swipeable
        ref={swipeableRef}
        friction={1.8}
        overshootRight={false}
        rightThreshold={32}
        renderRightActions={() => (
          <View style={styles.deleteRail}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                swipeableRef.current?.close();
                onDelete();
              }}
              activeOpacity={0.85}
            >
              <AppIcon name="delete" size={18} color="#ffffff" />
              <Text style={styles.deleteText}>{t('library.delete')}</Text>
            </TouchableOpacity>
          </View>
        )}
      >
        <View style={styles.rowCard}>
          <View
            onTouchStart={(event) => {
              touchStart.current = {
                x: event.nativeEvent.pageX,
                y: event.nativeEvent.pageY,
              };
              movedBySwipe.current = false;
            }}
            onTouchMove={(event) => {
              const start = touchStart.current;
              if (!start) return;
              const dx = Math.abs(event.nativeEvent.pageX - start.x);
              const dy = Math.abs(event.nativeEvent.pageY - start.y);
              if (dx > 6 && dx > dy) {
                movedBySwipe.current = true;
              }
            }}
          >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (movedBySwipe.current) return;
              onPress();
            }}
          >
            <View style={styles.rowInner}>
              {imageUri ? <Image source={{ uri: imageUri }} style={styles.rowImage} /> : <View style={styles.rowImagePlaceholder} />}
              <View style={styles.rowContent}>
                <View style={styles.rowMeta}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{chip}</Text>
                  </View>
                  <Text style={styles.rowTime}>{time}</Text>
                </View>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title ?? t('library.defaultUntitled')}</Text>
                <Text style={styles.rowDesc} numberOfLines={1}>{item.description ?? '...'}</Text>
              </View>
              <View style={styles.rowChevron}>
                <Text style={styles.rowChevronText}>{'<'}</Text>
              </View>
            </View>
          </TouchableOpacity>
          </View>
        </View>
      </Swipeable>
    </View>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const { articles, loadArticles, removeArticle } = useArticlesStore();
  const confirmDelete = useCallback((articleId: string) => {
    Alert.alert(
      t('article.deleteConfirmTitle'),
      t('article.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removeArticle(articleId) },
      ],
    );
  }, [removeArticle]);

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [loadArticles]),
  );

  const stats = useMemo<CollectionStat[]>(() => {
    const tagSets = articles.map((a) => parseTags(a.tags_json));
    const countByPrimary = new Map<string, number>();
    for (const tags of tagSets) {
      const primary = tags[0] ?? 'default';
      countByPrimary.set(primary, (countByPrimary.get(primary) ?? 0) + 1);
    }

    const fixedSlots: CollectionStat[] = [
      { name: t('tag.default'), icon: 'folder_open', count: 0, order: '01' },
      { name: t('tag.design'), icon: 'science', count: 0, order: '02' },
      { name: t('tag.tech'), icon: 'menu_book', count: 0, order: '03' },
    ];

    return fixedSlots.map((slot, idx) => {
      const key = idx === 0 ? 'default' : idx === 1 ? 'design' : 'tech';
      return {
        ...slot,
        count: countByPrimary.get(key) ?? 0,
      };
    });
  }, [articles]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{t('library.kicker')}</Text>
        <Text style={styles.brand}>Clipper</Text>
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadArticles} tintColor="#45655b" />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.grid}>
              {stats.map((s) => (
                <CollectionStatCard key={`${s.order}-${s.name}`} item={s} />
              ))}
              <View style={styles.newCollectionCard}>
                <AppIcon name="add_circle" size={22} color="#45655b" />
                <Text style={styles.newCollectionText}>{t('library.newCollection')}</Text>
              </View>
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('library.recentCollections')}</Text>
              <View style={styles.sortWrap}>
                <AppIcon name="sort" size={16} color="#000000" />
                <Text style={styles.sortText}>{t('library.sort')}</Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <ArticleRow item={item} onPress={() => router.push(`/article/${item.id}`)} onDelete={() => confirmDelete(item.id)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9faf7' },
  header: {
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  kicker: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 12, letterSpacing: 0.6, color: '#45655b', marginBottom: 6 },
  brand: { fontFamily: fontFamily.serif, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: '#1f3f37' },

  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 132, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 28 },
  statCard: {
    width: '47%',
    minHeight: 128,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(255,255,255,0.64)',
    padding: 16,
    justifyContent: 'space-between',
  },
  statTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statOrder: { fontFamily: fontFamily.mono, fontSize: 12, color: 'rgba(26,28,27,0.4)' },
  statName: { fontFamily: fontFamily.serif, fontSize: 24, lineHeight: 31, color: '#1a1c1b' },
  statCount: { fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 18, color: 'rgba(26,28,27,0.6)' },
  newCollectionCard: {
    width: '47%',
    minHeight: 128,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(255,255,255,0.64)',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  newCollectionText: { marginTop: 8, fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 12, letterSpacing: 0.6, color: '#1a1c1b' },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 2 },
  sectionTitle: { fontFamily: fontFamily.serif, fontSize: 24, lineHeight: 31, color: '#1a1c1b' },
  sortWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortText: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 12, letterSpacing: 0.6, color: '#45655b' },

  rowWrap: { borderRadius: 16, backgroundColor: '#f3f4f1', overflow: 'hidden', marginBottom: 6 },
  deleteRail: { width: 96, backgroundColor: '#ba1a1a', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteText: { color: '#ffffff', fontFamily: fontFamily.mono, fontSize: 10, letterSpacing: 0.8 },
  rowCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rowInner: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rowImage: { width: 78, height: 78, borderRadius: 10, backgroundColor: '#e2e3e0' },
  rowImagePlaceholder: { width: 78, height: 78, borderRadius: 10, backgroundColor: '#e2e3e0' },
  rowContent: { flex: 1, minWidth: 0 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  chip: { backgroundColor: 'rgba(199,234,222,0.35)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontFamily: fontFamily.mono, fontSize: 10, lineHeight: 10, color: '#4b6b61' },
  rowTime: { fontFamily: fontFamily.sans, fontSize: 11, lineHeight: 15, color: '#45474a' },
  rowTitle: { fontFamily: fontFamily.serif, fontSize: 17, lineHeight: 23, color: '#1a1c1b', marginBottom: 4 },
  rowDesc: { fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 19, color: '#45474a' },
  rowChevron: { opacity: 0.2 },
  rowChevronText: { fontSize: 16, color: '#1a1c1b' },
});
