import { useCallback, useMemo, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useArticlesStore } from '@/src/store/articles';
import type { Article, ArticleStatus } from '@/src/db/schema';

function statusBadge(status: ArticleStatus): { label: string; color: string } {
  switch (status) {
    case 'done':
      return { label: '已摘要', color: '#22c55e' };
    case 'error':
      return { label: '失败', color: '#ef4444' };
    case 'pending':
    case 'fetching':
    case 'summarising':
    default:
      return { label: '处理中', color: '#f59e0b' };
  }
}

function ArticleRow({ article, onPress }: { article: Article; onPress: () => void }) {
  const badge = statusBadge(article.status);
  const domain = (() => {
    try {
      return new URL(article.url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  })();
  const date = new Date(article.created_at).toLocaleDateString('zh-CN');

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowContent}>
        <Text style={styles.title} numberOfLines={2}>
          {article.title ?? '抓取中...'}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.source}>{domain}</Text>
          <Text style={styles.date}>{date}</Text>
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { articles, loaded, loadArticles, removeFailedArticles } = useArticlesStore();
  const [filter, setFilter] = useState<'all' | 'processing' | 'done' | 'error'>('all');

  const failedCount = articles.filter((a) => a.status === 'error').length;
  const doneCount = articles.filter((a) => a.status === 'done').length;
  const processingCount = articles.filter((a) => ['pending', 'fetching', 'summarising'].includes(a.status)).length;

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, []),
  );

  const onRefresh = useCallback(() => {
    loadArticles();
  }, []);

  const filteredArticles = useMemo(() => {
    if (filter === 'all') return articles;
    if (filter === 'done') return articles.filter((a) => a.status === 'done');
    if (filter === 'error') return articles.filter((a) => a.status === 'error');
    return articles.filter((a) => ['pending', 'fetching', 'summarising'].includes(a.status));
  }, [articles, filter]);

  const handleClearFailed = useCallback(() => {
    Alert.alert('清除失败文章', `确定删除 ${failedCount} 篇失败文章？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => removeFailedArticles(),
      },
    ]);
  }, [failedCount]);

  const renderItem = useCallback(
    ({ item }: { item: Article }) => (
      <ArticleRow
        article={item}
        onPress={() => router.push(`/article/${item.id}`)}
      />
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroGlowA} />
        <View style={styles.heroGlowB} />
        <Text style={styles.heroTitle}>Clipper</Text>
        <Text style={styles.heroSubtitle}>你的微信文章剪藏与摘要中心</Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>总计</Text>
            <Text style={styles.statValue}>{articles.length}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>已摘要</Text>
            <Text style={styles.statValue}>{doneCount}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>处理中</Text>
            <Text style={styles.statValue}>{processingCount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.storageBtn} onPress={() => router.push('/storage')}>
          <Text style={styles.storageBtnText}>导出与存储</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {[
          ['all', '全部'],
          ['processing', '处理中'],
          ['done', '已摘要'],
          ['error', '失败'],
        ].map(([value, label]) => {
          const active = filter === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(value as 'all' | 'processing' | 'done' | 'error')}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {failedCount > 0 && (
        <TouchableOpacity style={styles.clearBar} onPress={handleClearFailed}>
          <Text style={styles.clearText}>清除 {failedCount} 篇失败文章</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={filteredArticles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        contentContainerStyle={filteredArticles.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无文章</Text>
              <Text style={styles.emptyHint}>在微信中分享文章到 Clipper 即可开始</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef4ff' },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0f4ccf',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroGlowA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 200,
    backgroundColor: '#2e7bff',
    right: -60,
    top: -70,
    opacity: 0.45,
  },
  heroGlowB: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 160,
    backgroundColor: '#59a5ff',
    left: -30,
    bottom: -90,
    opacity: 0.25,
  },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 0.2 },
  heroSubtitle: { color: '#dbeafe', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statLabel: { color: '#bfdbfe', fontSize: 11 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    alignItems: 'flex-end',
  },
  storageBtn: {
    backgroundColor: '#0f4ccf',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  storageBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filters: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: '#1d4ed8',
  },
  filterChipText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  clearBar: {
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  clearText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  row: {
    backgroundColor: '#f8fbff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  rowContent: { gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', lineHeight: 22 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  source: { fontSize: 12, color: '#888' },
  date: { fontSize: 12, color: '#aaa' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '500' },
  listContent: { paddingBottom: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
  empty: { alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 18, color: '#999' },
  emptyHint: { fontSize: 13, color: '#bbb' },
});
